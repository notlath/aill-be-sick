# Threshold Calibration: MCD-Driven Recalibration

Date: 2026-04-06

## Summary

This recalibration updates five diagnostic and triage thresholds in the clinical decision support system to better reflect the empirical behaviour of the Monte Carlo Dropout (MCD) inference pipeline. The revision was driven primarily by the observed separation between correct and incorrect predictions in the MCD evaluation notebook, particularly the differences in confidence and mutual information (MI), together with the reported fold accuracy and Expected Calibration Error (ECE). The result is a more conservative threshold policy intended to improve the safety of automated acceptance and automated triage decisions.

## Evidence Base

### Fine-Tuning Notebook: `notebooks/finetuning/BioClinical_ModernBERT_base_Symptom2Disease_dataset_WITH_DROPOUT_42.ipynb`

This notebook contributed evidence regarding the general predictive quality of the fine-tuned English model, including a held-out test accuracy of approximately 0.9911. It therefore established that the classifier achieved strong task performance after fine-tuning. However, it did not provide threshold optimization for diagnostic acceptance or triage, did not quantify confidence separation between correct and incorrect predictions under MCD inference, and did not supply the uncertainty statistics required for recalibrating decision boundaries.

### MCD Evaluation Notebook: `notebooks/model_metrics_BioClinical_ModernBERT_MCD.ipynb`

This notebook served as the primary evidence source for threshold recalibration. It contributed fold-wise MCD performance estimates, confidence and mutual information summaries for correct and incorrect predictions, and calibration evidence through an ECE of approximately 0.0868. These outputs directly informed the threshold revision because they describe the operating characteristics of the deployed uncertainty-aware inference setting: 50 stochastic forward passes with inference dropout set to 0.05. However, this notebook did not contribute threshold evidence for the Tagalog model variant and did not establish deployment-specific clinical outcome data beyond the model-side uncertainty statistics.

## Observed Distributions

| Metric | Observed Value |
|---|---:|
| Correct prediction confidence | 0.9105 ± 0.0046 |
| Incorrect prediction confidence | 0.5422 ± 0.1412 |
| Correct prediction MI | 0.0032 ± 0.0006 |
| Incorrect prediction MI | 0.0347 ± 0.0205 |
| Fold accuracy | 0.9867 ± 0.0083 |
| Expected Calibration Error (ECE) | 0.0868 |

## Threshold Decisions

| Constant | Old Value | New Value | Statistical Justification |
|---|---:|---:|---|
| `VALID_MIN_CONF` | 0.70 | 0.75 | Incorrect predictions had a mean confidence of 0.5422 with a large dispersion of ±0.1412, indicating that the error distribution extends upward toward the low-0.70 range. Raising the validity floor to 0.75 moves the acceptance boundary farther from the incorrect-confidence mean while remaining substantially below the correct-confidence mean of 0.9105 ± 0.0046. |
| `VALID_MAX_UNCERTAINTY` | 0.05 | 0.04 | Correct predictions had a mean MI of 0.0032 ± 0.0006, whereas incorrect predictions had a much higher mean MI of 0.0347 ± 0.0205. Lowering the maximum acceptable MI from 0.05 to 0.04 shifts the validity ceiling closer to the centre of the incorrect-MI distribution while preserving a large gap from the correct-MI distribution. |
| `TRIAGE_HIGH_CONFIDENCE` | 0.90 | 0.92 | The correct-prediction confidence mean was 0.9105 ± 0.0046, while ECE remained 0.0868, indicating that confidence was useful but not perfectly calibrated. Increasing the automated-triage confidence requirement from 0.90 to 0.92 makes the automated bucket more conservative by requiring confidence above the observed correct-case mean rather than at approximately the same level. |
| `TRIAGE_LOW_UNCERTAINTY` | 0.03 | 0.02 | Correct predictions clustered at very low MI values (0.0032 ± 0.0006), whereas incorrect predictions were centered much higher at 0.0347 ± 0.0205. Tightening the low-uncertainty threshold from 0.03 to 0.02 places the automated bucket more clearly below the incorrect-case mean and closer to the region empirically occupied by correct predictions. |
| `TRIAGE_MEDIUM_CONFIDENCE_MIN` | 0.70 | 0.75 | With incorrect confidence at 0.5422 ± 0.1412, a 0.70 medium-triage floor sat only about 0.16 above the incorrect mean despite the wide spread of errors. Increasing the boundary to 0.75 enlarges the margin from the incorrect-confidence distribution while the correct-confidence mean remains much higher at 0.9105 ± 0.0046. |

## Trade-offs

These threshold changes are expected to improve the precision of the automatically accepted and automatically triaged cases by narrowing the set of predictions treated as sufficiently reliable for low-touch handling. The corresponding cost is reduced coverage: fewer cases will satisfy the stricter confidence and uncertainty requirements, and a larger proportion of patients will be routed to nurse or physician review. In operational terms, the recalibration prioritizes clinical safety over maximal automation.

## Recalibration Triggers

- Any update to the English model checkpoint, including retraining, re-fine-tuning, or replacement of `notlath/BioClinical-ModernBERT-base-Symptom2Disease_WITH-DROPOUT-42`
- Any change to the uncertainty inference configuration, including the inference dropout rate or the number of Monte Carlo forward passes
- Deployment or evaluation of the Tagalog model variant, which requires its own confidence and uncertainty distribution analysis
- Detectable dataset distribution shift, such as changes in symptom wording, class balance, input population, or deployment-domain case mix relative to the calibration setting

## Thesis Note

This recalibration supports the thesis claim that MCD-derived uncertainty estimates enable clinically safer automated triage by showing that confidence alone is insufficient for threshold setting. The observed separation between correct and incorrect predictions was evident not only in confidence but also, and more distinctly, in mutual information, with correct cases concentrated near 0.0032 MI and incorrect cases centered around 0.0347 MI. By incorporating both confidence and MCD-based uncertainty into threshold revision, the system moves automated handling toward cases that are empirically both high-confidence and low-doubt, thereby strengthening the methodological argument that uncertainty-aware inference is a practical mechanism for reducing unsafe automation in infectious disease decision support.
