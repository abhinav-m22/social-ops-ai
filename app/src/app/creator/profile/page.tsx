"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import {
  User,
  Receipt,
  CreditCard,
  Globe,
  Settings,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
} from "lucide-react"
import { fetchCreatorProfile, createOrUpdateCreatorProfile } from "@/lib/api"
import type { CreatorProfile, SocialProfile, SocialPlatform } from "@/types/creator-profile"

const socialPlatforms: { value: SocialPlatform; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "Twitter/X" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "whatsapp", label: "WhatsApp" },
]

const paymentTermsOptions = [
  { value: 7, label: "7 days" },
  { value: 15, label: "15 days" },
  { value: 30, label: "30 days" },
]

const DEFAULT_CREATOR_ID = "default-creator"
const requiredFields = ["fullName", "email", "phone", "pan", "bankName", "accountNumber", "ifsc"]

const Card = ({
  icon: Icon,
  title,
  children,
}: {
  icon: any
  title: string
  children: React.ReactNode
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
        <Icon size={20} />
      </div>
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
)

export default function CreatorProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [fullName, setFullName] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [pan, setPan] = useState("")
  const [gstin, setGstin] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [ifsc, setIfsc] = useState("")
  const [upiId, setUpiId] = useState("")
  const [socials, setSocials] = useState<SocialProfile[]>([])
  const [defaultPaymentTermsDays, setDefaultPaymentTermsDays] = useState(15)
  const [lateFeePercent, setLateFeePercent] = useState<number | null>(null)

  const isComplete =
    fullName.trim() &&
    email.trim() &&
    phone.trim() &&
    pan.trim() &&
    bankName.trim() &&
    accountNumber.trim() &&
    ifsc.trim()

  const isDirty =
    profile !== null &&
    (fullName !== (profile.fullName || "") ||
      businessName !== (profile.businessName || "") ||
      email !== (profile.email || "") ||
      phone !== (profile.phone || "") ||
      address !== (profile.address || "") ||
      pan !== (profile.pan || "") ||
      gstin !== (profile.gstin || "") ||
      bankName !== (profile.bankName || "") ||
      accountNumber !== (profile.accountNumber || "") ||
      ifsc !== (profile.ifsc || "") ||
      upiId !== (profile.upiId || "") ||
      defaultPaymentTermsDays !== (profile.defaultPaymentTermsDays || 15) ||
      lateFeePercent !== (profile.lateFeePercent || null) ||
      JSON.stringify(socials) !== JSON.stringify(profile.socials || []))

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const data = await fetchCreatorProfile(DEFAULT_CREATOR_ID)
      if (data) {
        setProfile(data)
        setFullName(data.fullName || "")
        setBusinessName(data.businessName || "")
        setEmail(data.email || "")
        setPhone(data.phone || "")
        setAddress(data.address || "")
        setPan(data.pan || "")
        setGstin(data.gstin || "")
        setBankName(data.bankName || "")
        setAccountNumber(data.accountNumber || "")
        setIfsc(data.ifsc || "")
        setUpiId(data.upiId || "")
        setSocials(data.socials || [])
        setDefaultPaymentTermsDays(data.defaultPaymentTermsDays || 15)
        setLateFeePercent(data.lateFeePercent || null)
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Basic validation
    const newErrors: Record<string, string> = {}
    if (!fullName.trim()) newErrors.fullName = "Required"
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Invalid email"
    if (!phone.trim() || phone.length < 10) newErrors.phone = "Invalid phone"
    if (!pan.trim() || pan.length !== 10) newErrors.pan = "Must be 10 characters"
    if (gstin && gstin.length !== 15) newErrors.gstin = "Must be 15 characters"
    if (!bankName.trim()) newErrors.bankName = "Required"
    if (!accountNumber.trim()) newErrors.accountNumber = "Required"
    if (!ifsc.trim() || ifsc.length !== 11) newErrors.ifsc = "Must be 11 characters"

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error("Please fix the errors")
      return
    }

    try {
      setSaving(true)
      const payload = {
        creatorId: DEFAULT_CREATOR_ID,
        fullName,
        businessName: businessName || undefined,
        email,
        phone,
        address: address || undefined,
        pan: pan.toUpperCase(),
        gstin: gstin.toUpperCase() || undefined,
        bankName,
        accountNumber,
        ifsc: ifsc.toUpperCase(),
        upiId: upiId || undefined,
        socials: socials.map((s) => ({
          ...s,
          url: s.url || undefined,
          followers: s.followers || undefined,
        })),
        defaultPaymentTermsDays,
        lateFeePercent: lateFeePercent || undefined,
      }
      const result = await createOrUpdateCreatorProfile(payload)
      setProfile(result.profile)
      toast.success("Profile saved successfully!")
      setErrors({})
    } catch (error: any) {
      toast.error(error?.message || "Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-10 lg:px-12 max-w-6xl mx-auto">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded-xl w-64 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded-lg w-96 animate-pulse" />
          <div className="grid md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-6 py-10 lg:px-12 max-w-6xl mx-auto pb-32">
      <form onSubmit={handleSubmit}>
        <header className="mb-8">
          <div className="mb-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </div>
          <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Creator Profile</h1>
              <p className="text-gray-500 text-lg">Used for invoices, deals & payments</p>
            </div>
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm ${
                isComplete
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {isComplete ? (
                <>
                  <CheckCircle2 size={16} />
                  Complete
                </>
              ) : (
                <>
                  <AlertCircle size={16} />
                  Incomplete
                </>
              )}
            </div>
          </div>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <Card icon={User} title="Personal & Business">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Full Name *</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 focus:outline-none focus:ring-2 bg-white"
              />
              {errors.fullName && <p className="text-sm text-red-600">{errors.fullName}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="John's Creative Studio"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 focus:outline-none focus:ring-2 bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 focus:outline-none focus:ring-2 bg-white"
              />
              {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Phone *</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 focus:outline-none focus:ring-2 bg-white"
              />
              {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street, City, State, ZIP"
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 focus:outline-none focus:ring-2 bg-white resize-none"
              />
            </div>
          </Card>

          <Card icon={Receipt} title="Tax Information">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">PAN *</label>
              <input
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                maxLength={10}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 focus:outline-none focus:ring-2 bg-white"
              />
              {errors.pan && <p className="text-sm text-red-600">{errors.pan}</p>}
              <p className="text-sm text-gray-500">10 characters, format: ABCDE1234F</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">GSTIN</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="12ABCDE1234F1Z5"
                maxLength={15}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 focus:outline-none focus:ring-2 bg-white"
              />
              {errors.gstin && <p className="text-sm text-red-600">{errors.gstin}</p>}
              <p className="text-sm text-gray-500">15 characters (optional)</p>
            </div>
            <div className="pt-2">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  gstin && gstin.length === 15
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-gray-50 text-gray-600 border border-gray-200"
                }`}
              >
                {gstin && gstin.length === 15 ? (
                  <>
                    <CheckCircle2 size={14} />
                    GST Registered
                  </>
                ) : (
                  "Not Registered"
                )}
              </div>
            </div>
          </Card>

          <Card icon={CreditCard} title="Payment Details">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Bank Name *</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="HDFC Bank"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 focus:outline-none focus:ring-2 bg-white"
              />
              {errors.bankName && <p className="text-sm text-red-600">{errors.bankName}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Account Number *</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="1234567890"
                maxLength={18}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 focus:outline-none focus:ring-2 bg-white"
              />
              {errors.accountNumber && <p className="text-sm text-red-600">{errors.accountNumber}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">IFSC *</label>
              <input
                type="text"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="HDFC0001234"
                maxLength={11}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 focus:outline-none focus:ring-2 bg-white"
              />
              {errors.ifsc && <p className="text-sm text-red-600">{errors.ifsc}</p>}
              <p className="text-sm text-gray-500">11 characters, format: ABCD0123456</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">UPI ID</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@bank"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 focus:outline-none focus:ring-2 bg-white"
              />
              <p className="text-sm text-gray-500">Optional: yourname@bank or yourname@upi</p>
            </div>
          </Card>

          <Card icon={Settings} title="Preferences">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Default Payment Terms</label>
              <select
                value={defaultPaymentTermsDays}
                onChange={(e) => setDefaultPaymentTermsDays(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 focus:outline-none focus:ring-2 bg-white"
              >
                {paymentTermsOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Late Fee %</label>
              <input
                type="number"
                value={lateFeePercent || ""}
                onChange={(e) => setLateFeePercent(e.target.value ? Number(e.target.value) : null)}
                placeholder="5"
                min={0}
                max={100}
                step={0.1}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 focus:outline-none focus:ring-2 bg-white"
              />
              <p className="text-sm text-gray-500">Optional: Late fee percentage (0-100)</p>
            </div>
          </Card>
        </div>

        <div className="mt-6">
          <Card icon={Globe} title="Social Profiles">
            <div className="space-y-4">
              {socials.map((social, index) => (
                <div key={index} className="grid md:grid-cols-12 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="md:col-span-3">
                    <label className="text-sm font-medium text-gray-700">Platform</label>
                    <select
                      value={social.platform}
                      onChange={(e) => {
                        const newSocials = [...socials]
                        newSocials[index].platform = e.target.value as SocialPlatform
                        setSocials(newSocials)
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 focus:outline-none focus:ring-2 bg-white"
                    >
                      {socialPlatforms.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-4">
                    <label className="text-sm font-medium text-gray-700">Handle</label>
                    <input
                      type="text"
                      value={social.handle}
                      onChange={(e) => {
                        const newSocials = [...socials]
                        newSocials[index].handle = e.target.value
                        setSocials(newSocials)
                      }}
                      placeholder="@username"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 focus:outline-none focus:ring-2 bg-white"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-sm font-medium text-gray-700">Profile URL</label>
                    <input
                      type="url"
                      value={social.url || ""}
                      onChange={(e) => {
                        const newSocials = [...socials]
                        newSocials[index].url = e.target.value
                        setSocials(newSocials)
                      }}
                      placeholder="https://..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 focus:outline-none focus:ring-2 bg-white"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-sm font-medium text-gray-700">Followers</label>
                    <input
                      type="number"
                      value={social.followers || ""}
                      onChange={(e) => {
                        const newSocials = [...socials]
                        newSocials[index].followers = e.target.value ? Number(e.target.value) : undefined
                        setSocials(newSocials)
                      }}
                      placeholder="0"
                      min={0}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 focus:outline-none focus:ring-2 bg-white"
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end pb-7">
                    <button
                      type="button"
                      onClick={() => setSocials(socials.filter((_, i) => i !== index))}
                      className="w-full px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors"
                    >
                      <Trash2 size={18} className="mx-auto" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setSocials([...socials, { platform: "instagram", handle: "", url: "", followers: undefined }])
                }
                className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/50 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Add Social Profile
              </button>
            </div>
          </Card>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 shadow-lg z-50">
          <div className="max-w-6xl mx-auto px-6 lg:px-12 py-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-gray-600">
                {profile === null ? (
                  "Fill your details, then save your profile."
                ) : isDirty ? (
                  "You have unsaved changes"
                ) : (
                  "All changes saved"
                )}
              </p>
              <button
                type="submit"
                disabled={saving || (profile !== null && !isDirty)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-sky-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {profile === null ? "Save Profile" : "Save Changes"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </main>
  )
}
