const NAME_REGEX = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
const USERNAME_REGEX = /^[A-Za-z0-9._]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_SPECIAL_REGEX = /[^A-Za-z0-9]/;
const ALLOWED_EXTENSIONS = ["Jr.", "Sr.", "II", "III", "IV", "V"];

export function normalizeSpaces(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeName(value) {
  return normalizeSpaces(value);
}

export function normalizeUsername(value) {
  return String(value || "").trim();
}

export function normalizeMiddleInitial(value) {
  return String(value || "").trim().toUpperCase();
}

export function normalizeExtension(value) {
  return String(value || "").trim();
}

export function validateName(value, fieldLabel) {
  const normalized = normalizeName(value);
  if (!normalized) return `${fieldLabel} is required.`;
  if (normalized.length < 2) return `${fieldLabel} must be at least 2 characters.`;
  if (normalized.length > 50) return `${fieldLabel} must not exceed 50 characters.`;
  if (!NAME_REGEX.test(normalized)) return `${fieldLabel} must contain letters only.`;
  return "";
}

export function validateMiddleInitial(value) {
  const normalized = normalizeMiddleInitial(value);
  if (!normalized) return "";
  if (!/^[A-Z]$/.test(normalized)) return "Middle initial must be one letter only.";
  return "";
}

export function validateExtension(value) {
  const normalized = normalizeExtension(value);
  if (!normalized) return "";
  if (!ALLOWED_EXTENSIONS.includes(normalized)) {
    return "Please enter a valid name extension.";
  }
  return "";
}

export function validateUsername(value) {
  const normalized = normalizeUsername(value);
  if (!normalized) return "Username is required.";
  if (normalized.length < 3) return "Username must be at least 3 characters.";
  if (normalized.length > 20) return "Username must not exceed 20 characters.";
  if (!USERNAME_REGEX.test(normalized)) {
    return "Username can only contain letters, numbers, underscores, and periods.";
  }
  if (/^[._]|[._]$/.test(normalized)) {
    return "Username cannot start or end with a period or underscore.";
  }
  return "";
}

export function validateEmail(value) {
  const normalized = normalizeEmail(value);
  if (!normalized) return "Email is required.";
  if (!EMAIL_REGEX.test(normalized)) return "Please enter a valid email address.";
  return "";
}

export function validatePassword(value, options = {}) {
  const {
    fieldLabel = "Password",
    compareTo = "",
    disallowSameAsOld = false,
  } = options;

  if (!value) return `${fieldLabel} is required.`;
  if (value.length < 8) return `${fieldLabel} must be at least 8 characters.`;
  if (value.length > 64) return `${fieldLabel} must not exceed 64 characters.`;
  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/\d/.test(value) || !PASSWORD_SPECIAL_REGEX.test(value)) {
    return `${fieldLabel} must include uppercase, lowercase, number, and special character.`;
  }
  if (disallowSameAsOld && compareTo && value === compareTo) {
    return "New password cannot be the same as your old password.";
  }
  return "";
}

export function validateConfirmPassword(password, confirmPassword, options = {}) {
  const { emptyMessage = "Please confirm your password." } = options;
  if (!confirmPassword) return emptyMessage;
  if (password !== confirmPassword) return "Passwords do not match.";
  return "";
}

export function validateLoginIdentifier(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "Email or username is required.";
  if (normalized.includes("@")) {
    return validateEmail(normalized);
  }
  if (normalized.length < 3) return "Username must be at least 3 characters.";
  if (!USERNAME_REGEX.test(normalized)) {
    return "Username can only contain letters, numbers, underscores, and periods.";
  }
  if (/^[._]|[._]$/.test(normalized)) {
    return "Username cannot start or end with a period or underscore.";
  }
  return "";
}

export function validateOtpCode(value, expectedLength = 6, fieldLabel = "Verification code") {
  const normalized = String(value || "").trim();
  if (!normalized) return `${fieldLabel} is required.`;
  if (!/^\d+$/.test(normalized)) return `${fieldLabel} must contain digits only.`;
  if (normalized.length !== expectedLength) return `${fieldLabel} must be ${expectedLength} digits.`;
  return "";
}

export function getPasswordChecks(value) {
  return {
    minLength: value.length >= 8,
    maxLength: value.length <= 64 && value.length > 0,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /\d/.test(value),
    special: PASSWORD_SPECIAL_REGEX.test(value),
  };
}

export function getPasswordStrength(value) {
  const checks = getPasswordChecks(value);
  const score = Object.values(checks).filter(Boolean).length;

  if (!value) return { label: "", width: "0%", color: "#D0D5DD" };
  if (score <= 2) return { label: "Weak", width: "33%", color: "#EF4444" };
  if (score <= 4) return { label: "Medium", width: "66%", color: "#F59E0B" };
  return { label: "Strong", width: "100%", color: "#22C55E" };
}

export function mapApiFieldError(message, mode) {
  const text = String(message || "").toLowerCase();

  if (mode === "register") {
    if (text.includes("username") && (text.includes("taken") || text.includes("exists") || text.includes("already"))) {
      return { field: "username", message: "Username is already taken." };
    }
    if (text.includes("email") && (text.includes("exists") || text.includes("already") || text.includes("registered"))) {
      return { field: "email", message: "Email is already registered." };
    }
  }

  if (mode === "login") {
    if (text.includes("verify") && text.includes("email")) {
      return { field: "login", message: "Please verify your email before signing in." };
    }
    if (text.includes("disabled") || text.includes("deactivated") || text.includes("blocked")) {
      return { field: "login", message: "Your account has been disabled. Please contact support." };
    }
    if (text.includes("invalid") || text.includes("incorrect") || text.includes("password")) {
      return { field: "password", message: "Invalid email/username or password." };
    }
  }

  if (mode === "forgotPassword") {
    if (text.includes("not found") || text.includes("no account")) {
      return { field: "email", message: "No account found with this email address." };
    }
    if (text.includes("disabled") || text.includes("blocked")) {
      return { field: "email", message: "Your account has been disabled. Please contact support." };
    }
  }

  if (mode === "otp") {
    if (text.includes("expired")) {
      return { field: "otp", message: "Verification code has expired. Please request a new one." };
    }
    if (text.includes("invalid") || text.includes("incorrect")) {
      return { field: "otp", message: "Invalid verification code." };
    }
  }

  if (mode === "reset") {
    if (text.includes("same as old")) {
      return { field: "newPassword", message: "New password cannot be the same as your old password." };
    }
    if (text.includes("expired")) {
      return { field: "otp", message: "Reset session expired. Please request a new reset code." };
    }
    if (text.includes("already used")) {
      return { field: "otp", message: "This reset code has already been used." };
    }
    if (text.includes("invalid") || text.includes("incorrect")) {
      return { field: "otp", message: "Invalid reset code. Please try again." };
    }
  }

  return null;
}
