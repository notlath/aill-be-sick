"use client";

import {
  type TemperatureUnit,
  TEMP_BOUNDS,
  validateTemperature,
  classifyFever,
  getFeverLabel,
  getFeverBadgeColor,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  FeverLevel,
} from "@/utils/fever-classification";
import { Thermometer, Info } from "lucide-react";
import { useState, useCallback, useEffect } from "react";

export type Language = "en" | "tl";

export interface FeverInputProps {
  /** Current temperature value (in the selected unit) */
  value: string;
  /** Called when temperature value changes */
  onChange: (value: string) => void;
  /** Current temperature unit */
  unit: TemperatureUnit;
  /** Called when unit changes */
  onUnitChange: (unit: TemperatureUnit) => void;
  /** Language for labels */
  language: Language;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Called when temperature classification changes (for auto-checking symptoms) */
  onClassificationChange?: (celsius: number | null) => void;
}

const FeverInput = ({
  value,
  onChange,
  unit,
  onUnitChange,
  language,
  disabled = false,
  onClassificationChange,
}: FeverInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Validate and get classification
  const validation = validateTemperature(value, unit);
  const feverLevel = validation.normalizedCelsius
    ? classifyFever(validation.normalizedCelsius)
    : null;

  // Notify parent of classification changes
  useEffect(() => {
    onClassificationChange?.(validation.normalizedCelsius);
  }, [validation.normalizedCelsius, onClassificationChange]);

  // Handle unit toggle with value conversion
  const handleUnitToggle = useCallback(() => {
    const newUnit: TemperatureUnit =
      unit === "celsius" ? "fahrenheit" : "celsius";

    // Convert existing value if valid
    if (value && validation.isValid && validation.normalizedCelsius !== null) {
      const currentCelsius = validation.normalizedCelsius;
      if (newUnit === "fahrenheit") {
        onChange(celsiusToFahrenheit(currentCelsius).toFixed(1));
      } else {
        onChange(currentCelsius.toFixed(1));
      }
    }

    onUnitChange(newUnit);
  }, [unit, value, validation, onChange, onUnitChange]);

  // Get bounds for current unit
  const minTemp =
    unit === "celsius" ? TEMP_BOUNDS.MIN_CELSIUS : TEMP_BOUNDS.MIN_FAHRENHEIT;
  const maxTemp =
    unit === "celsius" ? TEMP_BOUNDS.MAX_CELSIUS : TEMP_BOUNDS.MAX_FAHRENHEIT;

  // Labels
  const labels = {
    title: language === "en" ? "Body temperature" : "Temperatura ng katawan",
    optional: language === "en" ? "(optional)" : "(opsyonal)",
    placeholder: language === "en" ? "Enter temperature" : "Ilagay ang temperatura",
    tooltipTitle:
      language === "en"
        ? "How temperature affects symptoms"
        : "Paano nakakaapekto ang temperatura sa sintomas",
    tooltipBody:
      language === "en"
        ? "If you enter your temperature, the system will automatically select the appropriate fever symptom for you. You can still manually adjust the fever checkboxes if needed."
        : "Kung maglalagay ka ng temperatura, awtomatikong pipiliin ng sistema ang tamang sintomas ng lagnat para sa iyo. Maaari mo pa ring baguhin ang mga checkbox ng lagnat kung kinakailangan.",
  };

  return (
    <div className="bg-base-100/60 rounded-2xl p-4 border border-base-content/10 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 group">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
            <Thermometer className="size-4" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-base-content leading-tight">
              {labels.title}
            </span>
            <span className="text-[11px] text-base-content/50 leading-tight mt-0.5">
              {labels.optional}
            </span>
          </div>
        </div>

        {/* Info tooltip */}
        <div className="relative">
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-primary transition-colors"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            aria-label={labels.tooltipTitle}
          >
            <Info className="size-4" strokeWidth={2} />
          </button>
          {showTooltip && (
            <div className="absolute right-0 sm:-right-2 top-full mt-2 z-50 w-64 p-3 bg-base-100 border border-base-300 rounded-xl shadow-xl text-xs text-base-content/80 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
              <p className="font-semibold text-base-content mb-1">{labels.tooltipTitle}</p>
              <p>{labels.tooltipBody}</p>
            </div>
          )}
        </div>
      </div>

      {/* Input Group */}
      <div className="flex flex-col gap-3">
        <div className="join w-full shadow-sm hover:shadow transition-shadow">
          <div className="relative flex-1">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min={minTemp}
              max={maxTemp}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={disabled}
              placeholder={labels.placeholder}
              className={`input input-bordered join-item w-full pr-10 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary ${
                !validation.isValid && value
                  ? "input-error focus:border-error focus:ring-error"
                  : ""
              } ${disabled ? "opacity-60 cursor-not-allowed bg-base-200" : "bg-base-100"}`}
              aria-invalid={!validation.isValid && !!value}
              aria-describedby={
                !validation.isValid && value ? "temp-error" : undefined
              }
            />
            {/* Minimal Unit indication inside input */}
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-base-content/30 pointer-events-none">
              {unit === "celsius" ? "°C" : "°F"}
            </span>
          </div>

          {/* Unit toggle (attached to input) */}
          <button
            type="button"
            onClick={handleUnitToggle}
            disabled={disabled}
            className="btn btn-outline border-base-content/20 join-item bg-base-200 hover:bg-base-300 min-w-[70px] transition-colors"
            aria-label={
              language === "en" ? "Switch temperature unit" : "Palitan ang unit"
            }
          >
            <span
              className={`text-xs ${
                unit === "celsius" ? "font-bold text-base-content" : "text-base-content/50"
              }`}
            >
              °C
            </span>
            <span className="text-base-content/30 mx-0.5 text-[10px]">/</span>
            <span
              className={`text-xs ${
                unit === "fahrenheit" ? "font-bold text-base-content" : "text-base-content/50"
              }`}
            >
              °F
            </span>
          </button>
        </div>

        {/* Error message */}
        {!validation.isValid && value && (
          <p
            id="temp-error"
            className="text-xs text-error font-medium animate-in fade-in slide-in-from-top-1 duration-200 pl-1"
          >
            {language === "en" ? validation.error : validation.errorTagalog}
          </p>
        )}

        {/* Classification alert full-width row */}
        {feverLevel && validation.isValid && (
          <div
            className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium animate-in fade-in zoom-in-95 duration-300 border ${
              feverLevel === FeverLevel.NORMAL
                ? "bg-success/10 text-success-content border-success/20"
                : feverLevel === FeverLevel.LOW_GRADE
                  ? "bg-warning/10 text-warning-content border-warning/20"
                  : "bg-error/10 text-error-content border-error/20"
            }`}
          >
            <span
              className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                feverLevel === FeverLevel.NORMAL
                  ? "bg-success"
                  : feverLevel === FeverLevel.LOW_GRADE
                    ? "bg-warning"
                    : "bg-error"
              }`}
            />
            <div className="flex flex-col gap-0.5">
              <span>{getFeverLabel(feverLevel, language)}</span>
              {feverLevel !== FeverLevel.NORMAL && (
                <span className="opacity-75 leading-snug font-normal text-[11px]">
                  {language === "en"
                    ? "Symptom checked automatically."
                    : "Awtomatikong napili ang sintomas."}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeverInput;
