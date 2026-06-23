import os
import numpy as np
import pandas as pd
from PIL import Image, ImageDraw
import tensorflow as tf
from tensorflow.keras.layers import (
    Conv2D, MaxPooling2D, BatchNormalization, Activation, Add,
    Flatten, Dense, Input, GlobalAveragePooling2D, Dropout
)
from tensorflow.keras.models import Model
from tensorflow.keras.initializers import glorot_uniform
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import ReduceLROnPlateau, EarlyStopping, ModelCheckpoint
from sklearn.model_selection import train_test_split
from sklearn.utils import class_weight

print("TensorFlow Version:", tf.__version__)

# Configuration
CLASSES = ['No_DR', 'Mild', 'Moderate', 'Severe', 'Proliferate_DR']
IMG_SIZE = 128
TRAIN_DIR = './train'
IMAGES_PER_CLASS = {
    'No_DR': 1200,          # Reduced slightly for faster CPU training while keeping imbalance
    'Moderate': 800,
    'Mild': 300,
    'Severe': 150,
    'Proliferate_DR': 200,
}

# 1. Dataset Generation (Synthesizing Retinal Fundus Images)
def make_retinal_image(stage, img_size=128, seed=None):
    rng = np.random.default_rng(seed)
    bg = (rng.integers(25, 45), rng.integers(8, 20), rng.integers(8, 18))
    img = Image.new('RGB', (img_size, img_size), color=bg)
    draw = ImageDraw.Draw(img)
    cx, cy = img_size // 2, img_size // 2

    # Optic Disc
    disc_r = rng.integers(11, 17)
    dx = cx + rng.integers(-12, 12)
    dy = cy + rng.integers(-12, 12)
    disc_col = (rng.integers(210, 245), rng.integers(195, 230), rng.integers(110, 160))
    draw.ellipse([dx - disc_r, dy - disc_r, dx + disc_r, dy + disc_r], fill=disc_col)

    # Microaneurysms
    n_micro = {
        'No_DR': 0,
        'Mild': rng.integers(2, 6),
        'Moderate': rng.integers(6, 15),
        'Severe': rng.integers(15, 30),
        'Proliferate_DR': rng.integers(25, 40)
    }[stage]
    for _ in range(n_micro):
        mx = rng.integers(8, img_size - 8)
        my = rng.integers(8, img_size - 8)
        mr = rng.integers(1, 3)
        draw.ellipse([mx - mr, my - mr, mx + mr, my + mr],
                     fill=(rng.integers(130, 180), rng.integers(0, 20), 0))

    # Haemorrhages (Moderate+)
    if stage in ('Moderate', 'Severe', 'Proliferate_DR'):
        n_h = {'Moderate': rng.integers(2, 5),
               'Severe': rng.integers(5, 9),
               'Proliferate_DR': rng.integers(7, 13)}[stage]
        for _ in range(n_h):
            hx = rng.integers(12, img_size - 12)
            hy = rng.integers(12, img_size - 12)
            hr = rng.integers(4, 9)
            draw.ellipse([hx - hr, hy - hr, hx + hr, hy + hr],
                         fill=(rng.integers(160, 220), rng.integers(0, 15), 0))

    # Cotton-Wool Spots (Severe+)
    if stage in ('Severe', 'Proliferate_DR'):
        n_cw = rng.integers(2, 5)
        for _ in range(n_cw):
            wx = rng.integers(12, img_size - 12)
            wy = rng.integers(12, img_size - 12)
            wr = rng.integers(5, 10)
            b = rng.integers(185, 235)
            draw.ellipse([wx - wr, wy - wr, wx + wr, wy + wr], fill=(b, b, b - 25))

    # Neovascularisation Streaks (Proliferate only)
    if stage == 'Proliferate_DR':
        n_v = rng.integers(4, 9)
        for _ in range(n_v):
            x0 = rng.integers(10, img_size - 10)
            y0 = rng.integers(10, img_size - 10)
            x1 = int(np.clip(x0 + rng.integers(-30, 30), 5, img_size - 5))
            y1 = int(np.clip(y0 + rng.integers(-30, 30), 5, img_size - 5))
            draw.line([x0, y0, x1, y1],
                      fill=(rng.integers(190, 245), rng.integers(90, 150), rng.integers(30, 70)),
                      width=rng.integers(1, 3))

    # Subtle noise
    arr = np.array(img).astype(np.float32)
    noise = rng.normal(0, 3, arr.shape)
    return Image.fromarray(np.clip(arr + noise, 0, 255).astype(np.uint8))

print("Generating synthetic images...")
X_data = []
y_data = []

for class_idx, cls in enumerate(CLASSES):
    n = IMAGES_PER_CLASS[cls]
    print(f"Generating {n} images for {cls}...")
    for idx in range(n):
        img = make_retinal_image(cls, IMG_SIZE, seed=idx * 31 + class_idx * 1000)
        img_arr = np.array(img) / 255.0
        X_data.append(img_arr)
        y_data.append(class_idx)

X_data = np.array(X_data, dtype=np.float32)
y_data = np.array(y_data, dtype=np.int32)
y_data_categorical = tf.keras.utils.to_categorical(y_data, num_classes=5)

# Split data
X_train, X_val, y_train, y_val = train_test_split(
    X_data, y_data_categorical, test_size=0.2, random_state=42, stratify=y_data
)

# Compute class weights
y_train_labels = np.argmax(y_train, axis=1)
class_weights_arr = class_weight.compute_class_weight(
    class_weight='balanced',
    classes=np.arange(len(CLASSES)),
    y=y_train_labels
)
class_weight_dict = dict(enumerate(class_weights_arr))
print("Class Weights:", class_weight_dict)

# 2. ResNet Model Definition
def res_block(X, filters, stage):
    f = filters
    X_skip = X
    
    # Conv block
    X = Conv2D(f, (3, 3), padding='same', name=f'res{stage}_cb_c1',
               kernel_initializer=glorot_uniform(seed=0))(X)
    X = BatchNormalization(name=f'res{stage}_cb_bn1')(X)
    X = Activation('relu')(X)

    X = Conv2D(f, (3, 3), padding='same', name=f'res{stage}_cb_c2',
               kernel_initializer=glorot_uniform(seed=0))(X)
    X = BatchNormalization(name=f'res{stage}_cb_bn2')(X)

    # Shortcut projection
    X_skip = Conv2D(f, (1, 1), padding='same', name=f'res{stage}_cb_skip',
                    kernel_initializer=glorot_uniform(seed=0))(X_skip)
    X_skip = BatchNormalization(name=f'res{stage}_cb_skip_bn')(X_skip)

    X = Add()([X, X_skip])
    X = Activation('relu')(X)
    X = MaxPooling2D((2, 2))(X)   # Downsample

    # Identity block
    X_id = X
    X = Conv2D(f, (3, 3), padding='same', name=f'res{stage}_id_c1',
               kernel_initializer=glorot_uniform(seed=0))(X)
    X = BatchNormalization(name=f'res{stage}_id_bn1')(X)
    X = Activation('relu')(X)

    X = Conv2D(f, (3, 3), padding='same', name=f'res{stage}_id_c2',
               kernel_initializer=glorot_uniform(seed=0))(X)
    X = BatchNormalization(name=f'res{stage}_id_bn2')(X)
    X = Add()([X, X_id])
    X = Activation('relu')(X)
    return X

INPUT_SHAPE = (IMG_SIZE, IMG_SIZE, 3)
X_input = Input(INPUT_SHAPE)

# Entry block
X = Conv2D(32, (3, 3), padding='same', name='entry_conv',
           kernel_initializer=glorot_uniform(seed=0))(X_input)
X = BatchNormalization(name='entry_bn')(X)
X = Activation('relu')(X)
X = MaxPooling2D((2, 2))(X)

# Residual Stages
X = res_block(X, filters=64, stage=1)
X = res_block(X, filters=128, stage=2)

# Head
X = GlobalAveragePooling2D(name='gap')(X)
X = Dense(128, activation='relu', name='fc1',
          kernel_initializer=glorot_uniform(seed=0))(X)
X = Dropout(0.5)(X)
X = Dense(5, activation='softmax', name='output',
          kernel_initializer=glorot_uniform(seed=0))(X)

model = Model(inputs=X_input, outputs=X, name='LightResNet_DR')

model.compile(
    optimizer=Adam(learning_rate=3e-4),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

callbacks = [
    EarlyStopping(
        monitor='val_loss',
        patience=8,
        restore_best_weights=True,
        verbose=1
    ),
    ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.5,
        patience=4,
        min_lr=1e-7,
        verbose=1
    ),
    ModelCheckpoint(
        filepath='best_dr_model.keras',
        monitor='val_accuracy',
        save_best_only=True,
        verbose=1
    )
]

print("Training model...")
history = model.fit(
    X_train, y_train,
    epochs=35,
    batch_size=32,
    validation_data=(X_val, y_val),
    class_weight=class_weight_dict,
    callbacks=callbacks,
    verbose=1
)

print("Training finished! Model saved to best_dr_model.keras.")
