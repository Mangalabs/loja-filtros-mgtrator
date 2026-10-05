import type { InputHTMLAttributes, WheelEvent } from "react";

type NumericHtmlInputProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "inputMode" | "max" | "min" | "onWheel" | "step"
>;

function blurNumberInputOnWheel(event: WheelEvent<HTMLInputElement>) {
  event.currentTarget.blur();
}

export const wholeNumberInputProps: NumericHtmlInputProps = {
  step: 1,
  onWheel: blurNumberInputOnWheel,
};

export const nonNegativeWholeNumberInputProps: NumericHtmlInputProps = {
  inputMode: "numeric",
  min: 0,
  step: 1,
  onWheel: blurNumberInputOnWheel,
};

export const positiveWholeNumberInputProps: NumericHtmlInputProps = {
  inputMode: "numeric",
  min: 1,
  step: 1,
  onWheel: blurNumberInputOnWheel,
};

export const positiveDecimalQuantityInputProps: NumericHtmlInputProps = {
  inputMode: "decimal",
  min: 0.001,
  step: 0.001,
  onWheel: blurNumberInputOnWheel,
};

export const moneyInputProps: NumericHtmlInputProps = {
  inputMode: "decimal",
  step: 0.01,
  onWheel: blurNumberInputOnWheel,
};

export const nonNegativeMoneyInputProps: NumericHtmlInputProps = {
  ...moneyInputProps,
  min: 0,
};

export const positiveMoneyInputProps: NumericHtmlInputProps = {
  ...moneyInputProps,
  min: 0.01,
};

export const nonNegativePercentageInputProps: NumericHtmlInputProps = {
  inputMode: "decimal",
  min: 0,
  step: 0.01,
  onWheel: blurNumberInputOnWheel,
};
