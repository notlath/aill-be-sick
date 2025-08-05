# Naive Bayes Disease Prediction Guide

## Overview

This guide explains how to use the Naive Bayes machine learning model for disease prediction in your AILL-BE-SICK project. The implementation uses your `symbipredict_2022.csv` dataset to train a probabilistic model that can predict diseases based on symptoms.

## What is Naive Bayes?

Naive Bayes is a family of probabilistic classifiers based on Bayes' theorem with the "naive" assumption of conditional independence between features. For disease prediction:

- **Input**: Patient symptoms (fever, cough, headache, etc.)
- **Output**: Most likely disease with probability scores
- **Advantage**: Works well with small datasets, fast training and prediction
- **Formula**: P(Disease|Symptoms) = P(Symptoms|Disease) × P(Disease) / P(Symptoms)

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Train the Model

```bash
python quick_start.py
```

This will:

- Load your `symbipredict_2022.csv` dataset
- Preprocess the data
- Train the Naive Bayes model
- Save the trained model to `/models` directory
- Show training accuracy and metrics

### 3. Start the Flask API

```bash
python app.py
```

### 4. Test the API

```bash
# Test endpoint
curl http://localhost:8000/classifications/

# Disease prediction
curl -X POST http://localhost:8000/classifications/new \
  -H "Content-Type: application/json" \
  -d '{"symptoms": ["fever", "cough", "headache"]}'
```

## Dataset Requirements

Your `symbipredict_2022.csv` should have:

- **Symptom columns**: Binary (0/1) or categorical features
- **Disease column**: Target variable (disease names)
- **Format**: CSV with headers

Example structure:

```csv
fever,cough,headache,fatigue,disease
1,1,0,1,Influenza
0,1,1,0,Common Cold
1,0,1,1,Dengue
...
```

## API Endpoints

### GET `/classifications/`

Health check with model status

**Response:**

```json
{
  "message": "AI'll Be Sick - Disease Detection API",
  "status": "online",
  "model_loaded": true,
  "model_type": "Naive Bayes"
}
```

### POST `/classifications/new`

Disease prediction endpoint

**Request:**

```json
{
  "symptoms": ["fever", "cough", "headache"]
}
```

**Response:**

```json
{
  "data": "Influenza",
  "confidence": 0.85,
  "all_probabilities": {
    "Influenza": 0.85,
    "Common Cold": 0.1,
    "Dengue": 0.05
  },
  "model_used": "Naive Bayes",
  "features_matched": 3
}
```

### GET `/model/status`

Get detailed model information

**Response:**

```json
{
  "model_loaded": true,
  "model_metadata": {
    "train_accuracy": 0.92,
    "test_accuracy": 0.89,
    "n_features": 20,
    "n_classes": 5
  },
  "diseases": ["Influenza", "Common Cold", "Dengue", "Tuberculosis", "Malaria"]
}
```

### POST `/train`

Retrain the model (useful for updating with new data)

## Understanding the Results

### Confidence Score

- **0.8-1.0**: High confidence prediction
- **0.6-0.8**: Moderate confidence
- **0.4-0.6**: Low confidence
- **<0.4**: Very uncertain

### All Probabilities

Shows probability for each disease the model knows about. Helps understand alternative diagnoses.

### Features Matched

Number of symptoms that matched known features in the training data.

## Model Performance

After training, you'll see metrics like:

```
📈 Training Results:
🎯 Training Accuracy: 0.9200
🎯 Test Accuracy: 0.8900
🎯 Cross-validation Accuracy: 0.8750 (+/- 0.0300)
```

- **Training Accuracy**: How well the model fits the training data
- **Test Accuracy**: How well it predicts on unseen data
- **Cross-validation**: Average performance across multiple splits

## Troubleshooting

### Common Issues

1. **"Dataset not found"**

   - Ensure `symbipredict_2022.csv` is in the backend directory
   - Check file name spelling

2. **"No features matched"**

   - Your symptom names might not match dataset columns
   - Check the feature mapping in `app.py`

3. **"Low accuracy"**

   - Dataset might be too small
   - Features might not be discriminative
   - Consider data preprocessing

4. **"Model failed to load"**
   - Train the model first with `python quick_start.py`
   - Check if `/models` directory exists

### Improving Accuracy

1. **More Data**: Larger datasets generally improve accuracy
2. **Feature Engineering**: Create better symptom features
3. **Data Quality**: Clean and validate your dataset
4. **Hyperparameter Tuning**: Adjust Naive Bayes parameters

## Advanced Usage

### Custom Symptom Mapping

Edit the `common_mappings` in `app.py` to match your dataset features:

```python
common_mappings = {
    'fever': ['fever', 'high_temperature', 'pyrexia'],
    'cough': ['cough', 'coughing', 'productive_cough'],
    # Add your custom mappings
}
```

### Retraining with New Data

1. Update your `symbipredict_2022.csv` with new cases
2. Run `python quick_start.py` again
3. Restart your Flask app

### Model Evaluation

The training script provides detailed evaluation:

- Classification report with precision/recall per disease
- Confusion matrix
- Cross-validation scores

## Integration with Frontend

Your Next.js frontend automatically gets enhanced responses:

```typescript
const {
  success: detectedDisease,
  confidence,
  all_probabilities,
  model_used,
} = await detectDisease(formData);

console.log(`Predicted: ${detectedDisease} (${confidence}% confidence)`);
console.log(`Model: ${model_used}`);
```

## Files Structure

```
backend/
├── symbipredict_2022.csv      # Your dataset
├── train_naive_bayes.py       # Training script
├── quick_start.py             # Easy training runner
├── app.py                     # Flask API with ML integration
├── models/                    # Saved model files
│   ├── naive_bayes_model.pkl
│   ├── label_encoder.pkl
│   ├── scaler.pkl
│   └── model_metadata.json
└── requirements.txt           # Dependencies
```

## Next Steps

1. **Validate Results**: Test with known cases to verify accuracy
2. **Collect Feedback**: Have medical professionals review predictions
3. **Expand Dataset**: Add more symptoms and diseases
4. **Deploy**: Use Gunicorn for production deployment
5. **Monitor**: Track prediction accuracy over time

## Research Integration

This implementation aligns with your thesis research on:

- Probabilistic disease classification
- Symptom-based diagnosis
- Machine learning in healthcare
- Filipino/Philippine health data analysis

The Naive Bayes approach is particularly suitable for health screening systems due to its interpretability and effectiveness with limited data.
