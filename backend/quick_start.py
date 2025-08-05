"""
Quick Start Script for Training Naive Bayes Model
Run this script to quickly train and test your disease prediction model
"""

import os
import sys


def check_dependencies():
    """Check if required packages are installed"""
    required_packages = ["pandas", "numpy", "scikit-learn", "joblib"]

    missing_packages = []
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
        except ImportError:
            missing_packages.append(package)

    if missing_packages:
        print("❌ Missing required packages:")
        for package in missing_packages:
            print(f"   - {package}")
        print("\n💡 Install them with:")
        print(f"   pip install {' '.join(missing_packages)}")
        return False

    return True


def check_dataset():
    """Check if dataset exists"""
    dataset_path = "symbipredict_2022.csv"
    if not os.path.exists(dataset_path):
        print(f"❌ Dataset file '{dataset_path}' not found!")
        print("📂 Please ensure the dataset is in the backend directory.")
        return False

    print(f"✅ Dataset found: {dataset_path}")
    return True


def main():
    print("🚀 QUICK START - NAIVE BAYES TRAINING")
    print("=" * 50)

    print("\n1️⃣ Checking dependencies...")
    if not check_dependencies():
        return

    print("✅ All dependencies are installed!")

    print("\n2️⃣ Checking dataset...")
    if not check_dataset():
        return

    print("\n3️⃣ Starting training...")
    try:
        from train_naive_bayes import main as train_main

        train_main()

        print("\n4️⃣ Training completed successfully! 🎉")
        print("\n📋 Next steps:")
        print("   1. Run your Flask app: python app.py")
        print("   2. Test the API with symptoms")
        print("   3. Check the /models directory for saved model files")

    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure train_naive_bayes.py is in the same directory.")
    except Exception as e:
        print(f"❌ Training failed: {e}")
        print("Please check the error messages above and try again.")


if __name__ == "__main__":
    main()
