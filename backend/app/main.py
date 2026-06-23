import os
import shutil
import uuid
import datetime
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from .config import settings
from .database import get_db, init_db, User, Prediction, Report
from .auth import hash_password, verify_password, create_access_token, get_current_user
from .schemas import (
    UserRegister, Token, ForgotPasswordRequest, ResetPasswordRequest,
    UserResponse, PredictionResponse, BatchPredictionResponse, AuditLogResponse, DashboardStats
)
from .models.classifier import predict_retinal_image
from .models.gradcam import generate_gradcam_heatmap
from .utils import log_audit, generate_pdf_report

app = FastAPI(title="AcuSight AI Backend", version="1.0.0")

# Initialize database on startup
init_db()

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (uploaded images, heatmaps, PDF reports)
app.mount("/static", StaticFiles(directory="static"), name="static")


# ─── Auth Endpoints ────────────────────────────────────────────────────────────

@app.post("/api/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserRegister, request: Request, db: Session = Depends(get_db)):
    email_lower = user_in.email.lower()
    existing_user = db.query(User).filter(User.email == email_lower).first()
    if existing_user:
        log_audit(db, None, f"Register failed: email {email_lower} already exists", request.client.host)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    hashed = hash_password(user_in.password)
    db_user = User(name=user_in.name, email=email_lower, password=hashed)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    log_audit(db, db_user.id, "User registered successfully", request.client.host)
    return db_user


@app.post("/api/auth/login", response_model=Token)
def login_user(
    username: str = Form(...),
    password: str = Form(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    email_lower = username.lower()
    user = db.query(User).filter(User.email == email_lower).first()
    if not user or not verify_password(password, user.password):
        log_audit(db, None, f"Login failed for email: {email_lower}", request.client.host if request else None)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.email})
    log_audit(db, user.id, "User logged in successfully", request.client.host if request else None)
    return {"access_token": access_token, "token_type": "bearer", "name": user.name}


@app.post("/api/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    email_lower = req.email.lower()
    user = db.query(User).filter(User.email == email_lower).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User with this email not found.")

    temp_otp = "ACUSIGHT-" + str(uuid.uuid4())[:8].upper()
    user.password = hash_password(temp_otp)
    db.commit()

    log_audit(db, user.id, "Forgot password triggered - temp key created", request.client.host)
    return {
        "message": "Temporary verification password has been generated.",
        "temp_password": temp_otp
    }


@app.post("/api/auth/reset-password")
def reset_password(req: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if not verify_password(req.temp_password, user.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid temporary verification key.")

    user.password = hash_password(req.new_password)
    db.commit()

    log_audit(db, user.id, "Password reset successfully", request.client.host)
    return {"message": "Password has been successfully updated. You can now login with your new password."}


# ─── User Profile Endpoints ───────────────────────────────────────────────────

@app.get("/api/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@app.delete("/api/profile", status_code=status.HTTP_200_OK)
def delete_profile(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    def delete_local_file(rel_path):
        if not rel_path:
            return
        local_path = rel_path.lstrip("/")
        if os.path.exists(local_path):
            try:
                os.remove(local_path)
            except Exception as e:
                print(f"Warning: Could not delete file {local_path}: {e}")

    # Delete all associated files on disk
    predictions = db.query(Prediction).filter(Prediction.user_id == current_user.id).all()
    for pred in predictions:
        delete_local_file(pred.image_path)
        delete_local_file(pred.heatmap_path)
        delete_local_file(pred.report_path)

    # Delete user from DB. Cascades will handle predictions, reports, and logs
    db.delete(current_user)
    db.commit()

    return {"message": "Account successfully deleted."}


# ─── Prediction Endpoints ─────────────────────────────────────────────────────

@app.post("/api/predict", response_model=PredictionResponse)
def predict_fundus(
    file: UploadFile = File(...),
    phone: Optional[str] = Form(None),
    age: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. File format validation
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a JPG, JPEG, or PNG image."
        )

    # 2. File size validation (max 10 MB)
    contents = file.file.read()
    file_size_mb = len(contents) / (1024 * 1024)
    if file_size_mb > 10.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the maximum limit of 10 MB."
        )
    file.file.seek(0)

    # 3. Ensure upload directories exist
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "original"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "heatmap"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "reports"), exist_ok=True)

    # 4. Save uploaded file
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1]
    orig_filename = f"{file_id}_original{ext}"
    orig_path = os.path.join(settings.UPLOAD_DIR, "original", orig_filename)

    with open(orig_path, "wb") as buffer:
        buffer.write(contents)

    # 5. Run prediction pipeline (includes image quality validation)
    try:
        results = predict_retinal_image(orig_path, original_filename=file.filename)
    except ValueError as e:
        # Validation / quality-check rejection — surface the real message to the frontend
        if os.path.exists(orig_path):
            os.remove(orig_path)
        log_audit(db, current_user.id, f"Inference rejected: {str(e)}", request.client.host if request else None)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)   # real message shown to user
        )
    except Exception as e:
        if os.path.exists(orig_path):
            os.remove(orig_path)
        log_audit(db, current_user.id, f"Inference server error: {str(e)}", request.client.host if request else None)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference pipeline failed: {str(e)}"
        )

    # 6. Generate Grad-CAM heatmap overlay
    heatmap_filename = None
    heatmap_path = None
    try:
        heatmap_filename = f"{file_id}_heatmap.jpg"
        heatmap_path = os.path.join(settings.UPLOAD_DIR, "heatmap", heatmap_filename)

        pred_class_idx = results["probabilities"].index(max(results["probabilities"]))
        heatmap_colored, superimposed_img = generate_gradcam_heatmap(
            orig_path, results["preprocessed_tensor"], pred_class_idx
        )

        import cv2
        cv2.imwrite(heatmap_path, superimposed_img)
    except Exception as e:
        print(f"Warning: Grad-CAM generation failed: {e}")
        heatmap_path = None
        heatmap_filename = None

    # 7. Build static-relative paths
    rel_orig_path = f"/static/uploads/original/{orig_filename}"
    rel_heatmap_path = f"/static/uploads/heatmap/{heatmap_filename}" if heatmap_filename else None

    # 8. Generate PDF report
    report_filename = f"{file_id}_report.pdf"
    report_path = os.path.join(settings.UPLOAD_DIR, "reports", report_filename)
    rel_report_path = f"/static/uploads/reports/{report_filename}"

    scan_history = db.query(Prediction).filter(
        Prediction.user_id == current_user.id
    ).order_by(Prediction.scan_date.asc()).all()

    pdf_success = False
    try:
        pdf_success = generate_pdf_report(
            output_path=report_path,
            patient_name=current_user.name,
            email=current_user.email,
            phone=phone or "",
            age=age or "",
            gender=gender or "",
            prediction_class=results["class_name"],
            confidence=results["confidence"],
            risk_level=results["risk_level"],
            recommendation=results["recommendation"],
            detail_bullets=results.get("detail_bullets", []),
            clinical_summary=results["clinical_summary"],
            scan_date=datetime.datetime.utcnow(),
            orig_img_path=orig_path,
            heatmap_img_path=heatmap_path,
            scan_history=scan_history
        )
    except Exception as e:
        print(f"Warning: PDF report generation failed: {e}")
        pdf_success = False

    # 9. Persist prediction record
    db_pred = Prediction(
        user_id=current_user.id,
        image_path=rel_orig_path,
        heatmap_path=rel_heatmap_path,
        prediction_class=results["class_name"],
        confidence=results["confidence"],
        recommendation=results["recommendation"],
        report_path=rel_report_path if pdf_success else None,
        scan_date=datetime.datetime.utcnow()
    )
    db.add(db_pred)
    db.commit()
    db.refresh(db_pred)

    if pdf_success:
        db_report = Report(prediction_id=db_pred.id, report_path=rel_report_path)
        db.add(db_report)
        db.commit()

    log_audit(
        db, current_user.id,
        f"Executed prediction ID {db_pred.id}: class={db_pred.prediction_class}",
        request.client.host if request else None
    )
    return db_pred


@app.post("/api/batch-predict", response_model=BatchPredictionResponse)
def batch_predict_fundus(
    files: List[UploadFile] = File(...),
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    results = []
    errors = []

    os.makedirs(os.path.join(settings.UPLOAD_DIR, "original"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "heatmap"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "reports"), exist_ok=True)

    for file in files:
        try:
            if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                errors.append(f"{file.filename}: Unsupported file format.")
                continue

            contents = file.file.read()
            file.file.seek(0)

            file_id = str(uuid.uuid4())
            ext = os.path.splitext(file.filename)[1]
            orig_filename = f"{file_id}_original{ext}"
            orig_path = os.path.join(settings.UPLOAD_DIR, "original", orig_filename)

            with open(orig_path, "wb") as buffer:
                buffer.write(contents)

            inference = predict_retinal_image(orig_path)

            heatmap_filename = f"{file_id}_heatmap.jpg"
            heatmap_path = os.path.join(settings.UPLOAD_DIR, "heatmap", heatmap_filename)
            pred_class_idx = inference["probabilities"].index(max(inference["probabilities"]))
            heatmap_colored, superimposed_img = generate_gradcam_heatmap(
                orig_path, inference["preprocessed_tensor"], pred_class_idx
            )
            import cv2
            cv2.imwrite(heatmap_path, superimposed_img)

            rel_orig_path = f"/static/uploads/original/{orig_filename}"
            rel_heatmap_path = f"/static/uploads/heatmap/{heatmap_filename}"

            report_filename = f"{file_id}_report.pdf"
            report_path = os.path.join(settings.UPLOAD_DIR, "reports", report_filename)
            rel_report_path = f"/static/uploads/reports/{report_filename}"

            batch_history = db.query(Prediction).filter(
                Prediction.user_id == current_user.id
            ).order_by(Prediction.scan_date.asc()).all()

            pdf_success = False
            try:
                pdf_success = generate_pdf_report(
                    output_path=report_path,
                    patient_name=current_user.name,
                    email=current_user.email,
                    phone="",
                    age="",
                    gender="",
                    prediction_class=inference["class_name"],
                    confidence=inference["confidence"],
                    risk_level=inference["risk_level"],
                    recommendation=inference["recommendation"],
                    detail_bullets=inference.get("detail_bullets", []),
                    clinical_summary=inference["clinical_summary"],
                    scan_date=datetime.datetime.utcnow(),
                    orig_img_path=orig_path,
                    heatmap_img_path=heatmap_path,
                    scan_history=batch_history
                )
            except Exception as e:
                print(f"Warning: PDF generation failed for {file.filename}: {e}")

            db_pred = Prediction(
                user_id=current_user.id,
                image_path=rel_orig_path,
                heatmap_path=rel_heatmap_path,
                prediction_class=inference["class_name"],
                confidence=inference["confidence"],
                recommendation=inference["recommendation"],
                report_path=rel_report_path if pdf_success else None,
                scan_date=datetime.datetime.utcnow()
            )
            db.add(db_pred)
            db.commit()
            db.refresh(db_pred)
            results.append(db_pred)

        except Exception as e:
            errors.append(f"{file.filename}: {str(e)}")

    if not results and errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Batch prediction failed: " + "; ".join(errors)
        )

    log_audit(
        db, current_user.id,
        f"Batch prediction: {len(results)} succeeded, {len(errors)} failed",
        request.client.host if request else None
    )
    return {"predictions": results}


# ─── History & Progression Endpoints ─────────────────────────────────────────

@app.get("/api/history", response_model=List[PredictionResponse])
def get_user_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    history = db.query(Prediction).filter(
        Prediction.user_id == current_user.id
    ).order_by(Prediction.scan_date.desc()).all()
    return history


@app.delete("/api/history/{id}", status_code=status.HTTP_200_OK)
def delete_prediction(
    id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pred = db.query(Prediction).filter(Prediction.id == id).first()
    if not pred:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction record not found.")

    if pred.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this record."
        )

    def delete_local_file(rel_path):
        if not rel_path:
            return
        local_path = rel_path.lstrip("/")
        if os.path.exists(local_path):
            try:
                os.remove(local_path)
            except Exception as e:
                print(f"Warning: Could not delete file {local_path}: {e}")

    delete_local_file(pred.image_path)
    delete_local_file(pred.heatmap_path)
    delete_local_file(pred.report_path)

    db.delete(pred)
    db.commit()

    log_audit(db, current_user.id, f"Deleted prediction record ID {id}", request.client.host)
    return {"message": "Scan prediction record and associated files successfully deleted."}


# ─── Report Download Endpoint ──────────────────────────────────────────────────

@app.get("/api/report/{id}")
def get_pdf_report(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pred = db.query(Prediction).filter(Prediction.id == id).first()
    if not pred:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction record not found.")

    if pred.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this report."
        )

    if not pred.report_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No PDF report exists for this prediction.")

    local_pdf_path = pred.report_path.lstrip("/")
    if not os.path.exists(local_pdf_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report file not found on disk.")

    return FileResponse(
        local_pdf_path,
        media_type="application/pdf",
        filename=f"AcuSight_AI_Report_{pred.id}.pdf"
    )


# ─── Dashboard Stats Endpoint ──────────────────────────────────────────────────

@app.get("/api/stats", response_model=DashboardStats)
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    history = db.query(Prediction).filter(
        Prediction.user_id == current_user.id
    ).order_by(Prediction.scan_date.desc()).all()

    total_scans = len(history)
    latest_prediction = history[0] if total_scans > 0 else None

    return {
        "total_scans": total_scans,
        "latest_prediction": latest_prediction,
        "history": history
    }