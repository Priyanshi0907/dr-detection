from pydantic import BaseModel, Field
from typing import Optional, List
import datetime

# Authentication Schemas
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: str
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    name: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    temp_password: str
    new_password: str = Field(..., min_length=6)

# User Responses
class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Prediction Schemas
class PredictionResponse(BaseModel):
    id: int
    user_id: int
    image_path: str
    heatmap_path: Optional[str] = None
    prediction_class: str
    confidence: float
    recommendation: str
    report_path: Optional[str] = None
    scan_date: datetime.datetime

    class Config:
        from_attributes = True

# Batch Prediction Schema
class BatchPredictionResponse(BaseModel):
    predictions: List[PredictionResponse]

# Audit Log Response
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    ip_address: Optional[str] = None
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

# Dashboard Stats Response
class DashboardStats(BaseModel):
    total_scans: int
    latest_prediction: Optional[PredictionResponse] = None
    history: List[PredictionResponse]
