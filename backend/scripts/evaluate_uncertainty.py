#!/usr/bin/env python3
"""
Uncertainty Quality Evaluation Script

This script evaluates the quality of uncertainty quantification in the ML model.
It computes:
1. Expected Calibration Error (ECE)
2. Reliability diagram data
3. Multi-metric uncertainty analysis
4. Uncertainty separation (correct vs incorrect predictions)
5. Optimal threshold recommendations

Usage:
    python scripts/evaluate_uncertainty.py [--dataset PATH] [--model english|tagalog]

Requirements:
    - A test dataset with symptoms and true disease labels
    - The trained model loaded via ml_service
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    roc_auc_score,
    roc_curve,
)

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.ml_service import (
    compute_expected_calibration_error,
    compute_multi_metric_uncertainty,
    compute_reliability_diagram_data,
    compute_uncertainty_separation,
    eng_classifier,
    fil_classifier,
    optimize_uncertainty_threshold,
)


def load_test_dataset(dataset_path: str) -> tuple:
    """
    Load test dataset from JSON file.

    Expected format:
    [
        {"symptoms": "fever, headache, body pain", "disease": "Dengue"},
        ...
    ]

    Returns:
        symptoms_list, true_labels
    """
    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    symptoms_list = [item["symptoms"] for item in data]
    true_labels = [item["disease"] for item in data]

    return symptoms_list, true_labels


def evaluate_model(classifier, symptoms_list: list, true_labels: list, model_name: str):
    """
    Evaluate model predictions and uncertainty quality.

    Args:
        classifier: MCDClassifierWithSHAP instance
        symptoms_list: list of symptom texts
        true_labels: list of true disease labels
        model_name: name of the model for reporting
    """
    print(f"\n{'='*70}")
    print(f"Evaluating Model: {model_name}")
    print(f"{'='*70}\n")

    predictions = []
    confidences = []
    all_mc_predictions = []
    all_mean_probs = []
    all_std_probs = []

    # Collect predictions and uncertainty metrics
    for i, symptoms in enumerate(symptoms_list):
        print(f"Processing {i+1}/{len(symptoms_list)}...", end="\r")
        result = classifier.predict_with_uncertainty(symptoms)

        pred_label = result["predicted_label"][0]
        confidence = float(result["confidence"][0])
        mc_preds = result["mean_probabilities"]
        mean_probs = result["mean_probabilities"][0]
        std_probs = result["std_probabilities"][0]

        predictions.append(pred_label)
        confidences.append(confidence)
        all_mc_predictions.append(mc_preds)
        all_mean_probs.append(mean_probs)
        all_std_probs.append(std_probs)

    print(f"Completed {len(symptoms_list)} predictions")

    # Convert to numpy arrays
    predictions = np.array(predictions)
    confidences = np.array(confidences)
    all_mc_predictions = np.array(all_mc_predictions)
    all_mean_probs = np.array(all_mean_probs)
    all_std_probs = np.array(all_std_probs)

    # Convert true labels to same format as predictions
    label_to_idx = classifier.model.config.label2id
    true_labels_idx = np.array([label_to_idx[label] for label in true_labels])
    pred_labels_idx = np.array([label_to_idx[pred] for pred in predictions])

    # =========================================================================
    # 1. BASIC METRICS
    # =========================================================================
    print(f"\n{'='*70}")
    print("1. BASIC CLASSIFICATION METRICS")
    print(f"{'='*70}")

    accuracy = accuracy_score(true_labels_idx, pred_labels_idx)
    f1_macro = f1_score(true_labels_idx, pred_labels_idx, average="macro")
    f1_weighted = f1_score(true_labels_idx, pred_labels_idx, average="weighted")

    print(f"\nAccuracy:  {accuracy:.4f}")
    print(f"F1 Score (macro):   {f1_macro:.4f}")
    print(f"F1 Score (weighted): {f1_weighted:.4f}")

    print("\nClassification Report:")
    print(
        classification_report(
            true_labels, predictions, target_names=classifier.model.config.id2label.values()
        )
    )

    # =========================================================================
    # 2. CALIBRATION ANALYSIS
    # =========================================================================
    print(f"\n{'='*70}")
    print("2. CALIBRATION ANALYSIS")
    print(f"{'='*70}")

    # Compute accuracy per sample (1 if correct, 0 if incorrect)
    accuracies = (pred_labels_idx == true_labels_idx).astype(int)

    ece = compute_expected_calibration_error(
        pred_labels_idx, confidences, true_labels_idx, n_bins=10
    )
    print(f"\nExpected Calibration Error (ECE): {ece:.4f}")
    print(f"  (Lower is better, 0 = perfectly calibrated)")

    # Reliability diagram data
    rel_data = compute_reliability_diagram_data(confidences, accuracies, n_bins=10)
    print(f"\nReliability Diagram Data:")
    print(f"  Bin Centers: {rel_data['bin_centers']}")
    print(f"  Accuracies:  {rel_data['accuracies']}")
    print(f"  Confidences: {rel_data['confidences']}")
    print(f"  Counts:      {rel_data['counts']}")

    # Calibration interpretation
    avg_confidence = np.mean(confidences)
    avg_accuracy = np.mean(accuracies)
    calibration_gap = avg_confidence - avg_accuracy

    print(f"\nCalibration Summary:")
    print(f"  Average Confidence: {avg_confidence:.4f}")
    print(f"  Average Accuracy:   {avg_accuracy:.4f}")
    print(f"  Calibration Gap:    {calibration_gap:.4f}")

    if calibration_gap > 0.05:
        print("  ⚠️  Model is OVERCONFIDENT (confidence > accuracy)")
        print("     → Consider temperature scaling with T > 1.0")
    elif calibration_gap < -0.05:
        print("  ⚠️  Model is UNDERCONFIDENT (confidence < accuracy)")
        print("     → Consider temperature scaling with T < 1.0")
    else:
        print("  ✓ Model is well-calibrated")

    # =========================================================================
    # 3. MULTI-METRIC UNCERTAINTY ANALYSIS
    # =========================================================================
    print(f"\n{'='*70}")
    print("3. MULTI-METRIC UNCERTAINTY ANALYSIS")
    print(f"{'='*70}")

    # Compute multi-metric uncertainty for each prediction
    all_uncertainties = []
    for i in range(len(all_mc_predictions)):
        unc_metrics = compute_multi_metric_uncertainty(
            all_mc_predictions[i], all_mean_probs[i], all_std_probs[i]
        )
        all_uncertainties.append(unc_metrics)

    # Aggregate statistics
    mi_values = np.array([u["mutual_information"] for u in all_uncertainties])
    entropy_values = np.array([u["predictive_entropy"] for u in all_uncertainties])
    variance_values = np.array([u["variance"] for u in all_uncertainties])
    cv_values = np.array([u["coefficient_of_variation"] for u in all_uncertainties])
    disagreement_values = np.array([u["ensemble_disagreement"] for u in all_uncertainties])

    print(f"\nUncertainty Metric Statistics:")
    print(f"  Mutual Information:     {mi_values.mean():.4f} ± {mi_values.std():.4f}")
    print(f"  Predictive Entropy:     {entropy_values.mean():.4f} ± {entropy_values.std():.4f}")
    print(f"  Variance:               {variance_values.mean():.4f} ± {variance_values.std():.4f}")
    print(f"  Coefficient of Variation: {cv_values.mean():.4f} ± {cv_values.std():.4f}")
    print(f"  Ensemble Disagreement:  {disagreement_values.mean():.4f} ± {disagreement_values.std():.4f}")

    # =========================================================================
    # 4. UNCERTAINTY SEPARATION ANALYSIS
    # =========================================================================
    print(f"\n{'='*70}")
    print("4. UNCERTAINTY SEPARATION ANALYSIS")
    print(f"{'='*70}")

    # How well does MI separate correct from incorrect predictions?
    mi_separation = compute_uncertainty_separation(mi_values, accuracies)

    if mi_separation["can_evaluate"]:
        print(f"\nMutual Information Separation:")
        print(f"  Mean MI (Correct):    {mi_separation['mean_uncertainty_correct']:.4f}")
        print(f"  Mean MI (Incorrect):  {mi_separation['mean_uncertainty_incorrect']:.4f}")
        print(f"  Separation:           {mi_separation['separation_mean']:.4f}")
        print(f"  AUC-ROC:              {mi_separation['auc']:.4f}")

        if mi_separation["auc"] > 0.7:
            print("  ✓ MI effectively separates correct from incorrect predictions")
        elif mi_separation["auc"] > 0.6:
            print("  ⚠️  MI has moderate separation ability")
        else:
            print("  ✗ MI has poor separation ability")

    # Also check variance separation
    var_separation = compute_uncertainty_separation(variance_values, accuracies)

    if var_separation["can_evaluate"]:
        print(f"\nVariance Separation:")
        print(f"  Mean Var (Correct):    {var_separation['mean_uncertainty_correct']:.4f}")
        print(f"  Mean Var (Incorrect):  {var_separation['mean_uncertainty_incorrect']:.4f}")
        print(f"  Separation:            {var_separation['separation_mean']:.4f}")
        print(f"  AUC-ROC:               {var_separation['auc']:.4f}")

    # =========================================================================
    # 5. THRESHOLD OPTIMIZATION
    # =========================================================================
    print(f"\n{'='*70}")
    print("5. THRESHOLD OPTIMIZATION")
    print(f"{'='*70}")

    # Optimize MI threshold
    mi_optimal = optimize_uncertainty_threshold(mi_values, accuracies, metric="f1")
    print(f"\nOptimal MI Threshold (F1 maximization):")
    print(f"  Threshold: {mi_optimal['threshold']:.4f}")
    print(f"  Score:     {mi_optimal['score']:.4f}")
    print(f"  ROC-based: {mi_optimal['roc_optimal_threshold']:.4f}")
    print(f"  PR-based:  {mi_optimal['pr_optimal_threshold']:.4f}")

    # Optimize variance threshold
    var_optimal = optimize_uncertainty_threshold(variance_values, accuracies, metric="f1")
    print(f"\nOptimal Variance Threshold (F1 maximization):")
    print(f"  Threshold: {var_optimal['threshold']:.4f}")
    print(f"  Score:     {var_optimal['score']:.4f}")
    print(f"  ROC-based: {var_optimal['roc_optimal_threshold']:.4f}")
    print(f"  PR-based:  {var_optimal['pr_optimal_threshold']:.4f}")

    # =========================================================================
    # 6. RECOMMENDATIONS
    # =========================================================================
    print(f"\n{'='*70}")
    print("6. RECOMMENDATIONS")
    print(f"{'='*70}")

    recommendations = []

    # Calibration recommendations
    if abs(calibration_gap) > 0.05:
        if calibration_gap > 0:
            recommendations.append(
                f"1. Apply temperature scaling with T ≈ {1.0 + calibration_gap * 2:.2f} to reduce overconfidence"
            )
        else:
            recommendations.append(
                f"1. Apply temperature scaling with T ≈ {1.0 - abs(calibration_gap):.2f} to increase confidence"
            )

    # Threshold recommendations
    if mi_separation.get("can_evaluate", False):
        recommendations.append(
            f"2. Set MI uncertainty threshold to {mi_optimal['roc_optimal_threshold']:.4f} "
            f"(currently using 0.05)"
        )

    if var_separation.get("can_evaluate", False) and var_separation["auc"] > 0.6:
        recommendations.append(
            f"3. Consider adding variance threshold of {var_optimal['roc_optimal_threshold']:.4f} "
            f"as secondary uncertainty metric"
        )

    # Multi-metric recommendation
    if mi_separation.get("auc", 0) < 0.6 and var_separation.get("auc", 0) > 0.6:
        recommendations.append(
            "4. Variance outperforms MI for this model - consider using variance as primary metric"
        )

    if not recommendations:
        recommendations.append("✓ Current configuration appears well-tuned")
        recommendations.append("✓ No major calibration issues detected")

    print("\nBased on the analysis:")
    for rec in recommendations:
        print(f"  {rec}")

    # =========================================================================
    # 7. EXPORT RESULTS
    # =========================================================================
    results = {
        "model_name": model_name,
        "n_samples": len(symptoms_list),
        "basic_metrics": {
            "accuracy": float(accuracy),
            "f1_macro": float(f1_macro),
            "f1_weighted": float(f1_weighted),
        },
        "calibration": {
            "ece": float(ece),
            "avg_confidence": float(avg_confidence),
            "avg_accuracy": float(avg_accuracy),
            "calibration_gap": float(calibration_gap),
            "reliability_diagram": {
                "bin_centers": rel_data["bin_centers"].tolist(),
                "accuracies": rel_data["accuracies"].tolist(),
                "confidences": rel_data["confidences"].tolist(),
                "counts": rel_data["counts"].tolist(),
            },
        },
        "uncertainty_metrics": {
            "mutual_information": {
                "mean": float(mi_values.mean()),
                "std": float(mi_values.std()),
                "min": float(mi_values.min()),
                "max": float(mi_values.max()),
            },
            "variance": {
                "mean": float(variance_values.mean()),
                "std": float(variance_values.std()),
                "min": float(variance_values.min()),
                "max": float(variance_values.max()),
            },
            "ensemble_disagreement": {
                "mean": float(disagreement_values.mean()),
                "std": float(disagreement_values.std()),
            },
        },
        "separation_analysis": {
            "mi": mi_separation,
            "variance": var_separation,
        },
        "optimal_thresholds": {
            "mi": mi_optimal,
            "variance": var_optimal,
        },
        "recommendations": recommendations,
    }

    # Save results
    output_path = Path(__file__).parent / "uncertainty_evaluation_results.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print(f"\n{'='*70}")
    print(f"Results saved to: {output_path}")
    print(f"{'='*70}\n")

    return results


def main():
    parser = argparse.ArgumentParser(
        description="Evaluate uncertainty quantification quality"
    )
    parser.add_argument(
        "--dataset",
        type=str,
        default="test_data.json",
        help="Path to test dataset JSON file",
    )
    parser.add_argument(
        "--model",
        type=str,
        choices=["english", "tagalog", "both"],
        default="both",
        help="Which model to evaluate",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="uncertainty_evaluation_results.json",
        help="Output file path for results",
    )

    args = parser.parse_args()

    # Check if dataset exists
    dataset_path = Path(args.dataset)
    if not dataset_path.exists():
        print(f"Error: Dataset not found at {dataset_path}")
        print("\nPlease provide a test dataset in JSON format:")
        print('[{"symptoms": "fever, headache", "disease": "Dengue"}, ...]')
        sys.exit(1)

    # Load dataset
    print(f"Loading dataset from {dataset_path}...")
    symptoms_list, true_labels = load_test_dataset(str(dataset_path))
    print(f"Loaded {len(symptoms_list)} test samples")

    # Evaluate models
    if args.model in ["english", "both"]:
        evaluate_model(
            eng_classifier,
            symptoms_list,
            true_labels,
            "BioClinical ModernBERT (English)",
        )

    if args.model in ["tagalog", "both"]:
        evaluate_model(
            fil_classifier,
            symptoms_list,
            true_labels,
            "RoBERTa Tagalog",
        )

    print("\n✓ Evaluation complete!")


if __name__ == "__main__":
    main()
