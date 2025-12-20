"use client"

import { useState } from "react"
import { formatCurrency } from "@/lib/ui"
import { ChevronRight, CheckCircle2, Calculator, ArrowLeft, RefreshCw, AlertTriangle } from "lucide-react"
import { NumberTicker } from "./ui/number-ticker"
import { ShimmerButton } from "./ui/shimmer-button"
import { cn } from "@/lib/ui"

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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
          <Calculator size={24} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">ITR Filing Assistant</h2>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-10 overflow-hidden px-1">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center relative z-10">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  step >= s
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-white border-slate-200 text-slate-400"
                )}
              >
                {step > s ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <span className="font-bold text-sm tracking-tight">{s}</span>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider mt-2 transition-colors duration-300 whitespace-nowrap",
                step >= s ? "text-indigo-600" : "text-slate-400"
              )}>
                {s === 1 && "Income"}
                {s === 2 && "Presumptive"}
                {s === 3 && "Regime"}
                {s === 4 && "Result"}
              </span>
            </div>
            {s < 4 && (
              <div
                className={cn(
                  "flex-1 h-0.5 -mx-2.5 relative -top-2.5",
                  step > s ? "bg-indigo-600" : "bg-slate-200"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-75">
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Income Classification</h3>
            <div className="space-y-3">
              <label className="flex items-center p-5 border-2 border-indigo-100 bg-indigo-50/30 rounded-xl cursor-pointer hover:bg-indigo-50 transition-colors shadow-sm">
                <input
                  type="radio"
                  name="incomeType"
                  value="business"
                  checked={incomeType === "business"}
                  onChange={(e) => setIncomeType(e.target.value)}
                  className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <div className="ml-4">
                  <div className="font-bold text-slate-900">Business/Profession</div>
                  <div className="text-sm text-slate-500">Content creation, brand deals, freelancing.</div>
                </div>
              </label>
            </div>
            <p className="text-sm text-slate-500 mt-6 flex items-center gap-2 italic">
              <CheckCircle2 size={14} className="text-indigo-500" />
              Automated classification based on your account activity.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Presumptive Taxation Eligibility (Section 44ADA)
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              Tax is calculated on 50% of gross receipts if they are ≤ ₹50 lakhs for specified professions.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setPresumptiveEligible(true)}
                className={cn(
                  "p-5 border-2 rounded-xl text-left transition-all duration-200 shadow-sm",
                  presumptiveEligible === true
                    ? "border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-100"
                    : "border-slate-100 bg-slate-50/50 hover:border-slate-300 hover:bg-white"
                )}
              >
                <div className="font-bold text-slate-900 mb-1">Yes, I'm eligible</div>
                <div className="text-sm text-slate-500">Gross receipts ≤ ₹50 lakhs</div>
              </button>
              <button
                onClick={() => setPresumptiveEligible(false)}
                className={cn(
                  "p-5 border-2 rounded-xl text-left transition-all duration-200 shadow-sm",
                  presumptiveEligible === false
                    ? "border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-100"
                    : "border-slate-100 bg-slate-50/50 hover:border-slate-300 hover:bg-white"
                )}
              >
                <div className="font-bold text-slate-900 mb-1">No, not eligible</div>
                <div className="text-sm text-slate-500">Using regular books of accounts</div>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Tax Regime Selection</h3>
            <p className="text-sm text-slate-600 mb-6">
              We'll compare both regimes and suggest the most tax-efficient one.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => setRegime("old")}
                className={cn(
                  "p-5 border-2 rounded-xl text-left transition-all duration-200 shadow-sm",
                  regime === "old"
                    ? "border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-100"
                    : "border-slate-100 bg-slate-50/50 hover:border-slate-300 hover:bg-white"
                )}
              >
                <div className="font-bold text-slate-900 mb-1">Old Regime</div>
                <div className="text-sm text-slate-500">Traditional structure with deductions.</div>
              </button>
              <button
                onClick={() => setRegime("new")}
                className={cn(
                  "p-5 border-2 rounded-xl text-left transition-all duration-200 shadow-sm",
                  regime === "new"
                    ? "border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-100"
                    : "border-slate-100 bg-slate-50/50 hover:border-slate-300 hover:bg-white"
                )}
              >
                <div className="font-bold text-slate-900 mb-1">New Regime</div>
                <div className="text-sm text-slate-500">Simplified rates, no deductions.</div>
              </button>
            </div>

            {regime === "old" && (
              <div className="bg-slate-50 rounded-xl p-6 space-y-5 border border-slate-200 animate-in fade-in duration-300">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Section 80C Deductions (PPF, ELSS, Insurance)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={deduction80C}
                      onChange={(e) => setDeduction80C(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all shadow-sm"
                      placeholder="Max ₹1,50,000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Section 80D Deductions (Health Insurance)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={deduction80D}
                      onChange={(e) => setDeduction80D(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all shadow-sm"
                      placeholder="e.g. ₹25,000"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && result && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Tax Analysis Results</h3>
            <div className="bg-linear-to-br from-indigo-600 to-indigo-800 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden group space-y-6">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-1">Recommended Form</div>
                  <div className="text-3xl font-black text-white">{result.recommendedITR}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-1">Optimal Regime</div>
                  <div className="text-3xl font-black text-white">{result.suggestedRegime}</div>
                </div>
              </div>
              <div className="border-t border-indigo-200/50 pt-6 space-y-4">
                <div className="flex justify-between items-center text-indigo-100">
                  <span className="font-medium">Estimated Tax Payable</span>
                  <div className="flex items-center font-bold text-white text-xl">
                    <span>₹</span>
                    <NumberTicker value={result.estimatedTaxPayable} />
                  </div>
                </div>
                <div className="flex justify-between items-center text-indigo-100">
                  <span className="font-medium">Already Paid (TDS)</span>
                  <div className="flex items-center font-bold text-white text-xl">
                    <span>- ₹</span>
                    <NumberTicker value={result.alreadyPaidTDS} />
                  </div>
                </div>
                <div className="flex justify-between items-center bg-white/60 p-4 rounded-xl border border-indigo-200 shadow-inner">
                  <span className="font-bold text-slate-900 uppercase text-sm tracking-wide">Net Tax Remaining</span>
                  <div className="flex items-center text-2xl font-black text-indigo-600">
                    <span>₹</span>
                    <NumberTicker value={result.remaining} />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-6 flex items-center gap-2 italic">
              <AlertTriangle size={14} className="text-amber-500" />
              Calculations are estimates. Please consult a qualified tax professional (CA) before filing.
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-8 border-t border-slate-100">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        {step < 4 && (
          <ShimmerButton
            onClick={handleNext}
            disabled={
              (step === 2 && presumptiveEligible === null) ||
              (step === 3 && regime === null)
            }
            className="px-8 shadow-md"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </ShimmerButton>
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
            className="px-8 py-2.5 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg"
          >
            <RefreshCw size={16} />
            Start Over
          </button>
        )}
      </div>
    </div>
  )
}

