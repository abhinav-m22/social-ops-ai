"use client"

import { useState } from "react"
import { formatCurrency } from "@/lib/ui"
import { ChevronRight, CheckCircle2, Circle } from "lucide-react"

interface ITRResult {
  recommendedITR: string
  suggestedRegime: "Old" | "New"
  estimatedTaxPayable: number
  alreadyPaidTDS: number
  remaining: number
}

export function ITRAssistant({ totalEarnings, totalTDS }: { totalEarnings: number; totalTDS: number }) {
  const [step, setStep] = useState(1)
  const [incomeType, setIncomeType] = useState("business") // Pre-filled
  const [presumptiveEligible, setPresumptiveEligible] = useState<boolean | null>(null)
  const [regime, setRegime] = useState<"old" | "new" | null>(null)
  const [deduction80C, setDeduction80C] = useState(0)
  const [deduction80D, setDeduction80D] = useState(0)
  const [result, setResult] = useState<ITRResult | null>(null)

  const calculateTax = () => {
    // Simple tax calculation logic (FY 2024-25)
    const grossIncome = totalEarnings
    const tdsPaid = totalTDS

    // Calculate taxable income based on regime
    let taxableIncome = grossIncome
    let deductions = 0

    if (regime === "old") {
      // Old regime: Allow deductions
      deductions = deduction80C + deduction80D
      taxableIncome = Math.max(0, grossIncome - deductions)
    } else {
      // New regime: No deductions (standard deduction of ₹50,000 for business)
      taxableIncome = Math.max(0, grossIncome - 50000)
    }

    // Calculate tax based on slabs (Old Regime - FY 2024-25)
    let taxPayable = 0
    if (regime === "old") {
      if (taxableIncome <= 250000) {
        taxPayable = 0
      } else if (taxableIncome <= 500000) {
        taxPayable = (taxableIncome - 250000) * 0.05
      } else if (taxableIncome <= 1000000) {
        taxPayable = 12500 + (taxableIncome - 500000) * 0.20
      } else {
        taxPayable = 112500 + (taxableIncome - 1000000) * 0.30
      }
    } else {
      // New regime (FY 2024-25)
      if (taxableIncome <= 300000) {
        taxPayable = 0
      } else if (taxableIncome <= 700000) {
        taxPayable = (taxableIncome - 300000) * 0.05
      } else if (taxableIncome <= 1000000) {
        taxPayable = 20000 + (taxableIncome - 700000) * 0.10
      } else if (taxableIncome <= 1200000) {
        taxPayable = 50000 + (taxableIncome - 1000000) * 0.15
      } else if (taxableIncome <= 1500000) {
        taxPayable = 80000 + (taxableIncome - 1200000) * 0.20
      } else {
        taxPayable = 140000 + (taxableIncome - 1500000) * 0.30
      }
    }

    // Add 4% health and education cess
    taxPayable = taxPayable * 1.04

    // Determine ITR form
    let recommendedITR = "ITR-3"
    if (presumptiveEligible && grossIncome <= 2000000) {
      recommendedITR = "ITR-4"
    } else if (grossIncome <= 5000000 && regime === "new") {
      recommendedITR = "ITR-3"
    }

    // Determine better regime
    const oldRegimeTax = (() => {
      const oldTaxable = Math.max(0, grossIncome - deduction80C - deduction80D)
      let oldTax = 0
      if (oldTaxable <= 250000) {
        oldTax = 0
      } else if (oldTaxable <= 500000) {
        oldTax = (oldTaxable - 250000) * 0.05
      } else if (oldTaxable <= 1000000) {
        oldTax = 12500 + (oldTaxable - 500000) * 0.20
      } else {
        oldTax = 112500 + (oldTaxable - 1000000) * 0.30
      }
      return oldTax * 1.04
    })()

    const newRegimeTax = (() => {
      const newTaxable = Math.max(0, grossIncome - 50000)
      let newTax = 0
      if (newTaxable <= 300000) {
        newTax = 0
      } else if (newTaxable <= 700000) {
        newTax = (newTaxable - 300000) * 0.05
      } else if (newTaxable <= 1000000) {
        newTax = 20000 + (newTaxable - 700000) * 0.10
      } else if (newTaxable <= 1200000) {
        newTax = 50000 + (newTaxable - 1000000) * 0.15
      } else if (newTaxable <= 1500000) {
        newTax = 80000 + (newTaxable - 1200000) * 0.20
      } else {
        newTax = 140000 + (newTaxable - 1500000) * 0.30
      }
      return newTax * 1.04
    })()

    const suggestedRegime = oldRegimeTax < newRegimeTax ? "Old" : "New"
    const finalTax = suggestedRegime === "Old" ? oldRegimeTax : newRegimeTax
    const remaining = Math.max(0, finalTax - tdsPaid)

    setResult({
      recommendedITR,
      suggestedRegime,
      estimatedTaxPayable: Math.round(finalTax),
      alreadyPaidTDS: Math.round(tdsPaid),
      remaining: Math.round(remaining)
    })
  }

  const handleNext = () => {
    if (step === 1) {
      setStep(2)
    } else if (step === 2 && presumptiveEligible !== null) {
      setStep(3)
    } else if (step === 3 && regime !== null) {
      calculateTax()
      setStep(4)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
      if (step === 4) {
        setResult(null)
      }
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">ITR Filing Assistant</h2>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step >= s
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-gray-300 text-gray-400"
                }`}
              >
                {step > s ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <span className="font-semibold">{s}</span>
                )}
              </div>
              <span className="text-xs mt-2 text-gray-600 text-center">
                {s === 1 && "Income Type"}
                {s === 2 && "Presumptive"}
                {s === 3 && "Regime"}
                {s === 4 && "Result"}
              </span>
            </div>
            {s < 4 && (
              <div
                className={`flex-1 h-0.5 mx-2 ${
                  step > s ? "bg-emerald-600" : "bg-gray-300"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[300px]">
        {step === 1 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Income Type</h3>
            <div className="space-y-3">
              <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="incomeType"
                  value="business"
                  checked={incomeType === "business"}
                  onChange={(e) => setIncomeType(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900">Business/Profession</div>
                  <div className="text-sm text-gray-500">Content creation, freelancing, etc.</div>
                </div>
              </label>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Pre-filled based on your earnings data
            </p>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Presumptive Taxation Eligibility (Section 44ADA)
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you eligible for presumptive taxation? (Gross receipts ≤ ₹50 lakhs, 50% deemed profit)
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setPresumptiveEligible(true)}
                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                  presumptiveEligible === true
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-gray-900">Yes, I'm eligible</div>
                <div className="text-sm text-gray-500">Gross receipts ≤ ₹50 lakhs</div>
              </button>
              <button
                onClick={() => setPresumptiveEligible(false)}
                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                  presumptiveEligible === false
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-gray-900">No, not eligible</div>
                <div className="text-sm text-gray-500">Regular books of accounts</div>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Regime Comparison</h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose a regime to calculate. We'll show which is better for you.
            </p>
            <div className="space-y-3 mb-6">
              <button
                onClick={() => setRegime("old")}
                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                  regime === "old"
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-gray-900">Old Regime</div>
                <div className="text-sm text-gray-500">Allows deductions (80C, 80D, etc.)</div>
              </button>
              <button
                onClick={() => setRegime("new")}
                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                  regime === "new"
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-gray-900">New Regime</div>
                <div className="text-sm text-gray-500">Lower rates, fewer deductions</div>
              </button>
            </div>

            {regime === "old" && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Section 80C Deduction (₹)
                  </label>
                  <input
                    type="number"
                    value={deduction80C}
                    onChange={(e) => setDeduction80C(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g., 150000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Section 80D Deduction (₹)
                  </label>
                  <input
                    type="number"
                    value={deduction80D}
                    onChange={(e) => setDeduction80D(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g., 25000"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && result && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">ITR Filing Recommendation</h3>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Recommended ITR Form</div>
                  <div className="text-2xl font-bold text-emerald-700">{result.recommendedITR}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Suggested Regime</div>
                  <div className="text-2xl font-bold text-emerald-700">{result.suggestedRegime} Regime</div>
                </div>
              </div>
              <div className="border-t border-emerald-200 pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700">Estimated Tax Payable</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(result.estimatedTaxPayable)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Already Paid (TDS)</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(result.alreadyPaidTDS)}</span>
                </div>
                <div className="flex justify-between border-t border-emerald-200 pt-3">
                  <span className="font-semibold text-gray-900">Remaining Tax</span>
                  <span className="text-xl font-bold text-emerald-700">{formatCurrency(result.remaining)}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              This is a simplified calculation. Please consult a CA for accurate filing.
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6 pt-6 border-t border-gray-200">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Back
        </button>
        {step < 4 && (
          <button
            onClick={handleNext}
            disabled={
              (step === 2 && presumptiveEligible === null) ||
              (step === 3 && regime === null)
            }
            className="px-6 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        {step === 4 && (
          <button
            onClick={() => {
              setStep(1)
              setPresumptiveEligible(null)
              setRegime(null)
              setDeduction80C(0)
              setDeduction80D(0)
              setResult(null)
            }}
            className="px-6 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Start Over
          </button>
        )}
      </div>
    </div>
  )
}

