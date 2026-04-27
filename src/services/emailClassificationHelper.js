const checkisBusiness = (email) => {
  if (!email) return false;
  const businessDomains = [
    "info@",
    "contact@",
    "support@",
    "sales@",
    "service@",
    "admin@",
    "office@",
    "company.com",
    "business.com",
    "enterprise.com",
    "corporate.com",
  ];
  const privateDomains = [
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "aol.com",
    "icloud.com",
    "mail.com",
    "gmx.com",
    "protonmail.com",
  ];
  const emailLower = email.toLowerCase();
  for (const domain of businessDomains) {
    if (emailLower.includes(domain)) {
      return true;
    }
  }
  for (const domain of privateDomains) {
    if (emailLower.includes(domain)) {
      return false;
    }
  }

  return true;
};

module.exports = {
  checkisBusiness,
};
