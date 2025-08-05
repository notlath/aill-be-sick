"""
Naive Bayes Disease Prediction Training Script
Using symbipredict_2022.csv dataset for symptom-based disease classification
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.naive_bayes import GaussianNB, MultinomialNB
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
import joblib
import json
from datetime import datetime
import os


class NaiveBayesDiseasePredictor:
    def __init__(self):
        self.model = GaussianNB()
        self.label_encoder = LabelEncoder()
        self.scaler = StandardScaler()
        self.feature_columns = []
        self.disease_mapping = {}
        self.model_metadata = {}

    def load_dataset(self, csv_path="symbipredict_2022.csv"):
        """
        Load and explore the dataset
        """
        try:
            # Load the CSV file
            df = pd.read_csv(csv_path)
            print(f"✅ Dataset loaded successfully!")
            print(f"📊 Dataset shape: {df.shape}")
            print(f"🔍 Columns: {list(df.columns)}")
            print(f"📈 Sample data:")
            print(df.head())

            # Check for missing values
            print(f"\n🔍 Missing values:")
            print(df.isnull().sum())

            # Show data types
            print(f"\n📝 Data types:")
            print(df.dtypes)

            return df

        except FileNotFoundError:
            print(f"❌ Error: Dataset file '{csv_path}' not found!")
            print(
                "Make sure the symbipredict_2022.csv file is in the backend directory."
            )
            return None
        except Exception as e:
            print(f"❌ Error loading dataset: {e}")
            return None

    def preprocess_data(self, df):
        """
        Preprocess the dataset for training
        """
        # Make a copy to avoid modifying original data
        data = df.copy()

        # Identify the target column (likely 'disease', 'diagnosis', 'prognosis', etc.)
        possible_target_cols = [
            "disease",
            "diagnosis",
            "prognosis",
            "condition",
            "target",
            "label",
        ]
        target_col = None

        for col in possible_target_cols:
            if col in data.columns:
                target_col = col
                break

        if target_col is None:
            # If no obvious target column, assume last column is target
            target_col = data.columns[-1]
            print(f"⚠️ No obvious target column found. Using '{target_col}' as target.")

        print(f"🎯 Target column: {target_col}")

        # Separate features and target
        X = data.drop(target_col, axis=1)
        y = data[target_col]

        print(f"📊 Unique diseases: {y.nunique()}")
        print(f"🦠 Disease distribution:")
        print(y.value_counts())

        # Handle different data types
        numeric_features = X.select_dtypes(include=[np.number]).columns.tolist()
        categorical_features = X.select_dtypes(include=["object"]).columns.tolist()

        print(f"🔢 Numeric features: {len(numeric_features)}")
        print(f"📝 Categorical features: {len(categorical_features)}")

        # For symptom data, many columns might be binary (0/1) or text
        # Convert text symptoms to binary if needed
        for col in categorical_features:
            if X[col].dtype == "object":
                # Check if it's binary text (yes/no, true/false, etc.)
                unique_vals = X[col].unique()
                if len(unique_vals) <= 10:  # Assume categorical if few unique values
                    # Convert to binary encoding
                    X[col] = LabelEncoder().fit_transform(X[col].fillna("unknown"))

        # Fill missing values
        X = X.fillna(0)  # For symptom data, 0 usually means "symptom not present"

        # Store feature columns
        self.feature_columns = X.columns.tolist()

        # Encode target labels
        y_encoded = self.label_encoder.fit_transform(y)

        # Create disease mapping
        self.disease_mapping = dict(
            zip(range(len(self.label_encoder.classes_)), self.label_encoder.classes_)
        )

        print(f"🏷️ Disease mapping: {self.disease_mapping}")

        return X, y_encoded, y

    def train_model(self, X, y):
        """
        Train the Naive Bayes model
        """
        print("\n🚀 Starting Naive Bayes training...")

        # Split the data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        print(f"📊 Training set size: {X_train.shape[0]}")
        print(f"📊 Test set size: {X_test.shape[0]}")

        # Scale features (important for Gaussian Naive Bayes)
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        # Train the model
        self.model.fit(X_train_scaled, y_train)

        # Make predictions
        y_pred = self.model.predict(X_test_scaled)
        y_train_pred = self.model.predict(X_train_scaled)

        # Calculate accuracies
        train_accuracy = accuracy_score(y_train, y_train_pred)
        test_accuracy = accuracy_score(y_test, y_pred)

        # Cross-validation
        cv_scores = cross_val_score(self.model, X_train_scaled, y_train, cv=5)

        print(f"\n📈 Training Results:")
        print(f"🎯 Training Accuracy: {train_accuracy:.4f}")
        print(f"🎯 Test Accuracy: {test_accuracy:.4f}")
        print(
            f"🎯 Cross-validation Accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})"
        )

        # Detailed classification report
        print(f"\n📋 Classification Report:")
        target_names = [
            self.disease_mapping[i] for i in sorted(self.disease_mapping.keys())
        ]
        print(classification_report(y_test, y_pred, target_names=target_names))

        # Store model metadata
        self.model_metadata = {
            "train_accuracy": float(train_accuracy),
            "test_accuracy": float(test_accuracy),
            "cv_mean": float(cv_scores.mean()),
            "cv_std": float(cv_scores.std()),
            "n_features": len(self.feature_columns),
            "n_classes": len(self.disease_mapping),
            "training_date": datetime.now().isoformat(),
            "model_type": "Gaussian Naive Bayes",
        }

        return {
            "train_accuracy": train_accuracy,
            "test_accuracy": test_accuracy,
            "cv_scores": cv_scores,
            "classification_report": classification_report(
                y_test, y_pred, target_names=target_names, output_dict=True
            ),
        }

    def predict_disease(self, symptoms_dict):
        """
        Predict disease based on symptoms
        """
        try:
            # Convert symptoms to feature vector
            feature_vector = []

            for feature in self.feature_columns:
                if feature in symptoms_dict:
                    feature_vector.append(symptoms_dict[feature])
                else:
                    feature_vector.append(0)  # Symptom not present

            feature_vector = np.array(feature_vector).reshape(1, -1)

            # Scale features
            feature_scaled = self.scaler.transform(feature_vector)

            # Get prediction and probabilities
            prediction = self.model.predict(feature_scaled)[0]
            probabilities = self.model.predict_proba(feature_scaled)[0]

            # Get disease name
            disease_name = self.disease_mapping[prediction]
            confidence = float(max(probabilities))

            # Get all disease probabilities
            all_probabilities = {
                self.disease_mapping[i]: float(prob)
                for i, prob in enumerate(probabilities)
            }

            return {
                "predicted_disease": disease_name,
                "confidence": confidence,
                "all_probabilities": all_probabilities,
                "input_features": len([f for f in symptoms_dict.values() if f > 0]),
            }

        except Exception as e:
            return {
                "error": f"Prediction failed: {str(e)}",
                "predicted_disease": "Unknown",
                "confidence": 0.0,
            }

    def save_model(self, model_dir="models"):
        """
        Save the trained model and metadata
        """
        os.makedirs(model_dir, exist_ok=True)

        # Save model components
        joblib.dump(self.model, f"{model_dir}/naive_bayes_model.pkl")
        joblib.dump(self.label_encoder, f"{model_dir}/label_encoder.pkl")
        joblib.dump(self.scaler, f"{model_dir}/scaler.pkl")

        # Save metadata
        metadata = {
            "feature_columns": self.feature_columns,
            "disease_mapping": self.disease_mapping,
            "model_metadata": self.model_metadata,
        }

        with open(f"{model_dir}/model_metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)

        print(f"✅ Model saved successfully to '{model_dir}/'")
        print(f"📁 Files saved:")
        print(f"   - naive_bayes_model.pkl")
        print(f"   - label_encoder.pkl")
        print(f"   - scaler.pkl")
        print(f"   - model_metadata.json")

    def load_model(self, model_dir="models"):
        """
        Load a pre-trained model
        """
        try:
            # Load model components
            self.model = joblib.load(f"{model_dir}/naive_bayes_model.pkl")
            self.label_encoder = joblib.load(f"{model_dir}/label_encoder.pkl")
            self.scaler = joblib.load(f"{model_dir}/scaler.pkl")

            # Load metadata
            with open(f"{model_dir}/model_metadata.json", "r") as f:
                metadata = json.load(f)
                self.feature_columns = metadata["feature_columns"]
                self.disease_mapping = metadata["disease_mapping"]
                self.model_metadata = metadata["model_metadata"]

            print(f"✅ Model loaded successfully from '{model_dir}/'")
            print(
                f"🎯 Model accuracy: {self.model_metadata.get('test_accuracy', 'Unknown'):.4f}"
            )
            print(f"📊 Features: {len(self.feature_columns)}")
            print(f"🦠 Diseases: {len(self.disease_mapping)}")

            return True

        except Exception as e:
            print(f"❌ Error loading model: {e}")
            return False


def main():
    """
    Main training function
    """
    print("=" * 60)
    print("🏥 NAIVE BAYES DISEASE PREDICTION TRAINING")
    print("=" * 60)

    # Initialize predictor
    predictor = NaiveBayesDiseasePredictor()

    # Load dataset
    print("\n📂 Loading dataset...")
    df = predictor.load_dataset()

    if df is None:
        print("❌ Cannot proceed without dataset. Exiting...")
        return

    # Preprocess data
    print("\n⚙️ Preprocessing data...")
    X, y_encoded, y_original = predictor.preprocess_data(df)

    # Train model
    print("\n🚀 Training Naive Bayes model...")
    results = predictor.train_model(X, y_encoded)

    # Save model
    print("\n💾 Saving model...")
    predictor.save_model()

    # Test prediction
    print("\n🧪 Testing prediction...")

    # Create a sample test case (you can modify these symptoms)
    sample_symptoms = {}
    if len(predictor.feature_columns) > 0:
        # Set first few features to 1 (present) for testing
        for i, feature in enumerate(
            predictor.feature_columns[: min(5, len(predictor.feature_columns))]
        ):
            sample_symptoms[feature] = 1

    if sample_symptoms:
        prediction = predictor.predict_disease(sample_symptoms)
        print(f"🔍 Sample symptoms: {list(sample_symptoms.keys())}")
        print(f"🎯 Predicted disease: {prediction['predicted_disease']}")
        print(f"📊 Confidence: {prediction['confidence']:.4f}")

    print("\n" + "=" * 60)
    print("✅ TRAINING COMPLETE!")
    print("🚀 You can now run your Flask app with the trained model.")
    print("=" * 60)


if __name__ == "__main__":
    main()
