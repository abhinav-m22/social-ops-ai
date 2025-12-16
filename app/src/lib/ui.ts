export const cn = (...classes: Array<string | undefined | false | null>) =>
  classes.filter(Boolean).join(" ")

export const formatCurrency = (value?: number | null) => {
  if (typeof value !== "number") return "—"
  return Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

export const formatDate = (value?: string | null) => {
  if (!value) return "—"
  return new Date(value).toLocaleString()
}

