import { useState, useEffect } from "react";
import {
  Fingerprint,
  Landmark,
  IdCard,
  FileCheck2,
  Car,
  GraduationCap,
  BookOpen,
  Zap,
  CheckCircle2,
  Download,
  Copy,
  Check,
  Search,
  Upload,
  Paperclip,
  ShieldCheck,
  Tv,
  Smartphone,
  Droplets,
  Clock,
  Printer,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { NIGERIAN_STATES } from "../data/mockData";
const DASHBOARD_SERVICES_MENU = [
  {
    id: "nin-verification",
    label: "NIN Verification",
    shortDesc: "NIMC Identity Lookup & Slip",
    badge: "NIMC",
    icon: Fingerprint
  },
  {
    id: "bvn-verification",
    label: "BVN Verification",
    shortDesc: "NIBSS KYC & Watchlist Check",
    badge: "NIBSS",
    icon: Landmark
  },
  {
    id: "voters-card",
    label: "Voter's Card",
    shortDesc: "INEC PVC Verification",
    badge: "INEC",
    icon: IdCard
  },
  {
    id: "attestation",
    label: "Attestation",
    shortDesc: "Official AMMON Attestation Letter",
    badge: "Official",
    icon: FileCheck2
  },
  {
    id: "drivers-license",
    label: "Driver's License Verification",
    shortDesc: "FRSC License Status Check",
    badge: "FRSC",
    icon: Car
  },
  {
    id: "jamb-pin",
    label: "JAMB Pin",
    shortDesc: "UTME & Direct Entry e-PINs",
    badge: "UTME",
    icon: GraduationCap
  },
  {
    id: "waec-pin",
    label: "WAEC Pin",
    shortDesc: "Result Checker & GCE PINs",
    badge: "WAEC",
    icon: BookOpen
  },
  {
    id: "bill-payment",
    label: "Bill Payment",
    shortDesc: "Electricity, Cable TV & VTU",
    badge: "Utility",
    icon: Zap
  }
];
function downloadHtmlCertificate(filename, title, rows, footerNote) {
  const rowsHtml = rows.map(
    ([label, value]) => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;color:#4B5563;font-size:13px;font-weight:600;width:38%;text-align:left;">${label}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;color:#111827;font-size:13px;font-weight:700;text-align:left;font-family:monospace;">${value}</td>
        </tr>
      `
  ).join("");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title} - AMMON Official</title>
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#F3F4F6;padding:32px;margin:0;">
  <div style="max-width:720px;margin:0 auto;background:#FFFFFF;border:2px solid #176B37;border-radius:16px;overflow:hidden;">
    <div style="background:#14532D;color:#FFFFFF;padding:22px 28px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:18px;font-weight:800;letter-spacing:0.5px;">AMMON DIGITAL SERVICES</div>
        <div style="font-size:12px;color:#A7F3D0;margin-top:4px;">Association of Mobile Money Operators of Nigeria • RC 80540</div>
      </div>
      <div style="background:#176B37;border:1px solid rgba(255,255,255,0.3);padding:6px 12px;border-radius:999px;font-size:11px;font-weight:700;">
        VERIFIED RECORD
      </div>
    </div>
    <div style="padding:28px;">
      <h1 style="margin:0 0 6px;font-size:20px;color:#14532D;text-align:left;">${title}</h1>
      <p style="margin:0 0 20px;font-size:12px;color:#6B7280;text-align:left;">Generated via AMMON Authorized Identity & Utility Gateway</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;">
        ${rowsHtml}
      </table>
      <div style="margin-top:24px;padding:14px 16px;background:#EAF3ED;border-left:4px solid #176B37;font-size:12px;color:#14532D;text-align:left;">
        ${footerNote}
      </div>
    </div>
  </div>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
const DashboardServicesWorkspace = ({
  activeService,
  operatorName,
  operatorId,
  businessOrTitle,
  stateLocation,
  roleLabel
}) => {
  const storageKey = `ammon_services_logs_${operatorId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const [logs, setLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(logs));
    } catch {
    }
  }, [logs, storageKey]);
  const [copiedToken, setCopiedToken] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [ninNumber, setNinNumber] = useState("");
  const [ninSurname, setNinSurname] = useState("");
  const [ninConsent, setNinConsent] = useState(true);
  const [ninResult, setNinResult] = useState(null);
  const [bvnNumber, setBvnNumber] = useState("");
  const [bvnBank, setBvnBank] = useState("Moniepoint MFB");
  const [bvnPhone, setBvnPhone] = useState("");
  const [bvnResult, setBvnResult] = useState(null);
  const [vinNumber, setVinNumber] = useState("");
  const [voterSurname, setVoterSurname] = useState("");
  const [voterState, setVoterState] = useState(stateLocation || "Lagos");
  const [voterResult, setVoterResult] = useState(null);
  const [attestType, setAttestType] = useState("Operator Good Standing & Regulatory Attestation");
  const [attestRecipient, setAttestRecipient] = useState("Central Bank of Nigeria / Commercial Bank Compliance");
  const [attestPurpose, setAttestPurpose] = useState("");
  const [attestFileName, setAttestFileName] = useState("");
  const [attestResult, setAttestResult] = useState(null);
  const [dlNumber, setDlNumber] = useState("");
  const [dlDob, setDlDob] = useState("1991-06-14");
  const [dlState, setDlState] = useState(stateLocation || "Lagos");
  const [dlResult, setDlResult] = useState(null);
  const [jambType, setJambType] = useState("UTME Regular (₦6,200)");
  const [jambProfileCode, setJambProfileCode] = useState("");
  const [jambCandidate, setJambCandidate] = useState("");
  const [jambPhone, setJambPhone] = useState("");
  const [jambQty, setJambQty] = useState(1);
  const [jambResult, setJambResult] = useState(null);
  const [waecType, setWaecType] = useState("WAEC Result Checker e-PIN (₦3,800)");
  const [waecCandidate, setWaecCandidate] = useState("");
  const [waecPhone, setWaecPhone] = useState("");
  const [waecQty, setWaecQty] = useState(1);
  const [waecResult, setWaecResult] = useState(null);
  const [billCategory, setBillCategory] = useState("electricity");
  const [billProvider, setBillProvider] = useState("EKEDC Prepaid (Eko Electric)");
  const [billAccount, setBillAccount] = useState("");
  const [billCustomerVerified, setBillCustomerVerified] = useState(null);
  const [billAmount, setBillAmount] = useState("5000");
  const [billMethod, setBillMethod] = useState("AMMON Agent Float Wallet");
  const [billResult, setBillResult] = useState(null);
  const [formError, setFormError] = useState("");
  useEffect(() => {
    setFormError("");
  }, [activeService]);
  const currentMeta = DASHBOARD_SERVICES_MENU.find((s) => s.id === activeService) || DASHBOARD_SERVICES_MENU[0];
  const HeaderIcon = currentMeta.icon;
  const pushLog = (record) => {
    setLogs((prev) => [record, ...prev].slice(0, 30));
  };
  const handleCopy = (value) => {
    navigator.clipboard.writeText(value);
    setCopiedToken(value);
    setTimeout(() => setCopiedToken(null), 1800);
  };
  const runSimulatedGateway = (callback) => {
    setFormError("");
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      callback();
    }, 450);
  };
  const handleVerifyNin = (e) => {
    e.preventDefault();
    const cleaned = ninNumber.replace(/\D/g, "");
    if (cleaned.length !== 11) {
      setFormError("Please enter a valid 11-digit National Identification Number (NIN).");
      return;
    }
    if (!ninConsent) {
      setFormError("Customer/Operator NIMC verification consent is required.");
      return;
    }
    runSimulatedGateway(() => {
      const ref = `NIMC-${Date.now().toString().slice(-8)}`;
      const surname = ninSurname.trim() || operatorName.split(" ").slice(-1)[0] || "ADEBAYO";
      const rec = {
        id: ref,
        serviceId: "nin-verification",
        serviceName: "NIN Verification",
        reference: ref,
        subject: `${surname.toUpperCase()} (${cleaned.slice(0, 4)}***${cleaned.slice(-3)})`,
        amount: "₦150",
        status: "Verified",
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        details: {
          "NIN Number": cleaned,
          "Tracking ID": `TRK-${Math.floor(1e8 + Math.random() * 9e8)}`,
          "Verified Full Name": ninSurname.trim() ? `${ninSurname.toUpperCase()} OLUMIDE` : operatorName.toUpperCase(),
          "Date of Birth": "14-06-1991",
          "Gender": "Verified Match",
          "State of Origin": stateLocation || "Lagos State",
          "NIMC Watchlist": "CLEAN — NO RESTRICTION",
          "Verified By": `${operatorName} (${operatorId})`
        }
      };
      setNinResult(rec);
      pushLog(rec);
    });
  };
  const handleVerifyBvn = (e) => {
    e.preventDefault();
    const cleaned = bvnNumber.replace(/\D/g, "");
    if (cleaned.length !== 11) {
      setFormError("Please enter a valid 11-digit Bank Verification Number (BVN).");
      return;
    }
    runSimulatedGateway(() => {
      const ref = `NIBSS-BVN-${Date.now().toString().slice(-7)}`;
      const rec = {
        id: ref,
        serviceId: "bvn-verification",
        serviceName: "BVN Verification",
        reference: ref,
        subject: `${bvnBank} (${cleaned.slice(0, 3)}***${cleaned.slice(-3)})`,
        amount: "₦100",
        status: "Verified",
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        details: {
          "BVN Number": cleaned,
          "Enrolment Bank": bvnBank,
          "Registered Phone": bvnPhone.trim() || "+234 803 000 4129",
          "Account Name Match": operatorName.toUpperCase(),
          "KYC Tier": "TIER 3 — FULL COMPLIANCE",
          "NIBSS Watchlist": "CLEAR (0 FRAUD FLAGS)",
          "Verification Ref": ref
        }
      };
      setBvnResult(rec);
      pushLog(rec);
    });
  };
  const handleVerifyVotersCard = (e) => {
    e.preventDefault();
    if (vinNumber.trim().length < 10) {
      setFormError("Enter a valid INEC Voter Identification Number (VIN, at least 10 characters).");
      return;
    }
    runSimulatedGateway(() => {
      const ref = `INEC-PVC-${Date.now().toString().slice(-7)}`;
      const rec = {
        id: ref,
        serviceId: "voters-card",
        serviceName: "Voter's Card",
        reference: ref,
        subject: `${vinNumber.trim().toUpperCase()} (${voterState})`,
        amount: "₦150",
        status: "Verified",
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        details: {
          "VIN Code": vinNumber.trim().toUpperCase(),
          "Registered Holder": (voterSurname.trim() || operatorName).toUpperCase(),
          "State / Constituency": `${voterState} Central`,
          "Registration Area / Ward": "Ward 04 Commercial District",
          "Polling Unit": "PU 019 — Civic Centre Square",
          "PVC Status": "VALID & ACTIVE IN INEC REGISTER",
          "Verification Ref": ref
        }
      };
      setVoterResult(rec);
      pushLog(rec);
    });
  };
  const handleGenerateAttestation = (e) => {
    e.preventDefault();
    if (!attestRecipient.trim()) {
      setFormError("Please specify the receiving institution or authority.");
      return;
    }
    runSimulatedGateway(() => {
      const ref = `AMMON-ATT-${(/* @__PURE__ */ new Date()).getFullYear()}-${Math.floor(1e4 + Math.random() * 9e4)}`;
      const rec = {
        id: ref,
        serviceId: "attestation",
        serviceName: "Attestation",
        reference: ref,
        subject: attestType,
        amount: "₦1,500",
        status: "Issued",
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        details: {
          "Certificate Ref": ref,
          "Attestation Type": attestType,
          "Subject / Bearer": `${operatorName} (${roleLabel})`,
          "Operator / Badge ID": operatorId,
          "Entity / Directorate": businessOrTitle,
          "Addressed To": attestRecipient.trim(),
          "Supporting Attachment": attestFileName || "Registry KYC Dossier On File",
          "Purpose Summary": attestPurpose.trim() || "Official CBN / Banking Partner & Statutory Identity Attestation",
          "Issuing Authority": "AMMON National Secretariat (RC 80540)"
        }
      };
      setAttestResult(rec);
      pushLog(rec);
    });
  };
  const handleVerifyDriversLicense = (e) => {
    e.preventDefault();
    if (dlNumber.trim().length < 8) {
      setFormError("Please enter a valid FRSC Driver's License number (e.g. LAG12345AA12).");
      return;
    }
    runSimulatedGateway(() => {
      const ref = `FRSC-DL-${Date.now().toString().slice(-7)}`;
      const rec = {
        id: ref,
        serviceId: "drivers-license",
        serviceName: "Driver's License Verification",
        reference: ref,
        subject: `${dlNumber.trim().toUpperCase()} (${dlState})`,
        amount: "₦200",
        status: "Verified",
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        details: {
          "License Number": dlNumber.trim().toUpperCase(),
          "Holder Name": operatorName.toUpperCase(),
          "Date of Birth": dlDob,
          "License Class": "CLASS B — MOTOR VEHICLE",
          "Issuing State": `${dlState} Command`,
          "Issue / Expiry": "18 Mar 2023 — 18 Mar 2028",
          "FRSC Status": "VALID & ACTIVE"
        }
      };
      setDlResult(rec);
      pushLog(rec);
    });
  };
  const handleVendJambPin = (e) => {
    e.preventDefault();
    if (jambProfileCode.replace(/\D/g, "").length < 8) {
      setFormError("Enter a valid 10-digit JAMB Candidate Profile Code.");
      return;
    }
    runSimulatedGateway(() => {
      const unitPrice = jambType.includes("7,700") ? 7700 : jambType.includes("5,700") ? 5700 : 6200;
      const total = unitPrice * jambQty;
      const pins = Array.from({ length: jambQty }, (_, i) => {
        const rand = Math.floor(1e11 + Math.random() * 899999999999);
        return `JMB-${rand.toString().slice(0, 4)}-${rand.toString().slice(4, 8)}-${rand.toString().slice(8, 12)}${i > 0 ? `-${i + 1}` : ""}`;
      }).join(" | ");
      const ref = `JAMB-${Date.now().toString().slice(-8)}`;
      const rec = {
        id: ref,
        serviceId: "jamb-pin",
        serviceName: "JAMB Pin",
        reference: ref,
        subject: `${jambCandidate || "Candidate"} (${jambQty}x PIN)`,
        amount: `₦${total.toLocaleString()}`,
        status: "Issued",
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        details: {
          "Vending Ref": ref,
          "Exam Category": jambType,
          "Profile Code": jambProfileCode.trim(),
          "Candidate Name": (jambCandidate.trim() || "JAMB UTME Candidate").toUpperCase(),
          "SMS Phone": jambPhone.trim() || "+234 800 000 0000",
          "Generated e-PIN(s)": pins,
          "Total Paid": `₦${total.toLocaleString()}`,
          "Agent Commission": `₦${(jambQty * 250).toLocaleString()} Credited`
        }
      };
      setJambResult(rec);
      pushLog(rec);
    });
  };
  const handleVendWaecPin = (e) => {
    e.preventDefault();
    runSimulatedGateway(() => {
      const unitPrice = waecType.includes("27,500") ? 27500 : waecType.includes("4,200") ? 4200 : 3800;
      const total = unitPrice * waecQty;
      const pinCode = `${Math.floor(1e11 + Math.random() * 899999999999)}`;
      const serialNo = `WRN${Math.floor(1e8 + Math.random() * 899999999)}`;
      const ref = `WAEC-${Date.now().toString().slice(-8)}`;
      const rec = {
        id: ref,
        serviceId: "waec-pin",
        serviceName: "WAEC Pin",
        reference: ref,
        subject: `${waecCandidate || "WAEC Candidate"} (${waecQty}x PIN)`,
        amount: `₦${total.toLocaleString()}`,
        status: "Issued",
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        details: {
          "Vending Ref": ref,
          "WAEC Product": waecType,
          "Candidate Name": (waecCandidate.trim() || "WAEC Examination Candidate").toUpperCase(),
          "Phone": waecPhone.trim() || "+234 800 000 0000",
          "e-PIN Token": pinCode,
          "Serial Number": serialNo,
          "Quantity": `${waecQty} Unit(s)`,
          "Total Settled": `₦${total.toLocaleString()}`,
          "Agent Commission": `₦${(waecQty * 200).toLocaleString()} Earned`
        }
      };
      setWaecResult(rec);
      pushLog(rec);
    });
  };
  const handlePayBill = (e) => {
    e.preventDefault();
    if (billAccount.trim().length < 6) {
      setFormError("Please enter a valid Meter Number, Smartcard IUC, or Phone Number.");
      return;
    }
    const amt = Number(billAmount);
    if (!amt || amt < 100) {
      setFormError("Minimum bill payment amount is ₦100.");
      return;
    }
    runSimulatedGateway(() => {
      const ref = `PAY-${Date.now().toString().slice(-8)}`;
      const stsToken = billCategory === "electricity" ? `${Math.floor(1e3 + Math.random() * 9e3)}-${Math.floor(1e3 + Math.random() * 9e3)}-${Math.floor(1e3 + Math.random() * 9e3)}-${Math.floor(1e3 + Math.random() * 9e3)}-${Math.floor(1e3 + Math.random() * 9e3)}` : `ACTIVE-${Math.floor(1e5 + Math.random() * 9e5)}`;
      const rec = {
        id: ref,
        serviceId: "bill-payment",
        serviceName: "Bill Payment",
        reference: ref,
        subject: `${billProvider.split(" ")[0]} • ${billAccount.trim()}`,
        amount: `₦${amt.toLocaleString()}`,
        status: "Completed",
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        details: {
          "Transaction Ref": ref,
          "Biller / Provider": billProvider,
          "Meter / Account / Phone": billAccount.trim(),
          "Customer Name": billCustomerVerified || operatorName.toUpperCase(),
          "Amount Paid": `₦${amt.toLocaleString()}`,
          "Payment Channel": billMethod,
          [billCategory === "electricity" ? "20-Digit STS Token" : "Service Token / Receipt"]: stsToken,
          ...billCategory === "electricity" ? { "Energy Units": `${(amt / 68.5).toFixed(1)} kWh` } : {}
        }
      };
      setBillResult(rec);
      pushLog(rec);
    });
  };
  const handleBillCategoryChange = (cat) => {
    setBillCategory(cat);
    setBillCustomerVerified(null);
    setBillResult(null);
    if (cat === "electricity") setBillProvider("EKEDC Prepaid (Eko Electric)");
    if (cat === "cable") setBillProvider("DStv Compact Bouquet");
    if (cat === "airtime") setBillProvider("MTN Nigeria VTU / Data");
    if (cat === "water") setBillProvider("Lagos Water Corporation (LWC)");
  };
  const renderResultCard = (record, downloadLabel) => {
    if (!record) return null;
    const entries = Object.entries(record.details);
    return <div className="bg-white rounded-2xl border-2 border-[#176B37] shadow-sm overflow-hidden text-left animate-in fade-in duration-150">
        <div className="bg-[#14532D] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 text-left">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            <div>
              <h4 className="font-bold text-sm leading-tight">{record.serviceName} — {record.status}</h4>
              <p className="text-[11px] text-emerald-200 font-mono">Ref: {record.reference}</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-400 text-slate-900 uppercase">
            {record.status}
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {entries.map(([key, val]) => {
      const isCopyable = key.toLowerCase().includes("pin") || key.toLowerCase().includes("token") || key.toLowerCase().includes("ref");
      return <div key={key} className="p-3 rounded-xl bg-[#F9FBFA] border border-[#E5E7EB] text-left">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  {key}
                </span>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="font-bold text-[#252525] font-mono break-all">{val}</span>
                  {isCopyable && <button
        type="button"
        onClick={() => handleCopy(val)}
        className="p-1 text-[#176B37] hover:bg-[#EAF3ED] rounded cursor-pointer shrink-0"
        title="Copy value"
      >
                      {copiedToken === val ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>}
                </div>
              </div>;
    })}
        </div>

        <div className="px-5 py-3.5 bg-[#EAF3ED]/70 border-t border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-[#14532D] font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#176B37]" />
            Logged in AMMON Service Audit Trail ({record.timestamp})
          </span>
          <div className="flex items-center gap-2">
            <button
      type="button"
      onClick={() => downloadHtmlCertificate(
        `${record.reference}.html`,
        `AMMON ${record.serviceName} Record`,
        entries,
        `Issued securely via AMMON Digital Portal by ${operatorName} (${operatorId}).`
      )}
      className="px-4 py-2 bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
    >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadLabel}</span>
            </button>
            <button
      type="button"
      onClick={() => window.print()}
      className="px-3 py-2 bg-white hover:bg-gray-50 text-[#176B37] border border-[#176B37]/30 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
    >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>;
  };
  const activeLogs = logs.filter((l) => l.serviceId === activeService);
  return <div className="space-y-6 text-left animate-in fade-in duration-150">
      {
    /* Left-Justified Service Header Banner */
  }
      <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#EAF3ED] text-[#176B37] border border-[#176B37]/20 flex items-center justify-center shrink-0">
            <HeaderIcon className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EAF3ED] text-[#176B37]">
                {currentMeta.badge} Gateway
              </span>
              <span className="text-[11px] font-mono text-gray-400">
                Session: {roleLabel} ({operatorId})
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[#252525] mt-1">
              {currentMeta.label}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {currentMeta.shortDesc} — Authorized AMMON Identity, Certification & Utility Service Desk
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#176B37] bg-[#EAF3ED]/70 px-3 py-1.5 rounded-xl border border-[#176B37]/15 shrink-0">
          <Clock className="w-3.5 h-3.5" />
          <span>Instant Settlement</span>
        </div>
      </div>

      {formError && <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2 text-left">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{formError}</span>
        </div>}

      {
    /* 1. NIN VERIFICATION */
  }
      {activeService === "nin-verification" && <div className="space-y-5">
          <form onSubmit={handleVerifyNin} className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4 text-left">
            <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#252525]">NIMC National Identity Verification</h4>
                <p className="text-xs text-gray-500">Verify operator or customer 11-digit NIN against NIMC database</p>
              </div>
              <button
    type="button"
    onClick={() => {
      setNinNumber("70129485731");
      setNinSurname(operatorName.split(" ").slice(-1)[0] || "EZE");
    }}
    className="text-[11px] font-bold text-[#176B37] bg-[#EAF3ED] px-2.5 py-1 rounded-lg hover:bg-emerald-100 cursor-pointer"
  >
                Fill Sample NIN
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">11-Digit NIN Number *</label>
                <input
    type="text"
    maxLength={11}
    required
    value={ninNumber}
    onChange={(e) => setNinNumber(e.target.value)}
    placeholder="e.g., 70129485731"
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] font-mono focus:outline-hidden focus:border-[#176B37]"
  />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Surname Match (Optional)</label>
                <input
    type="text"
    value={ninSurname}
    onChange={(e) => setNinSurname(e.target.value)}
    placeholder="e.g., EZE"
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
  />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input
    type="checkbox"
    checked={ninConsent}
    onChange={(e) => setNinConsent(e.target.checked)}
    className="rounded border-gray-300 text-[#176B37] focus:ring-[#176B37]"
  />
              <span>I confirm holder consent has been obtained in line with NDPA / NIMC verification guidelines.</span>
            </label>

            <div className="flex justify-start">
              <button
    type="submit"
    disabled={processing}
    className="px-6 py-2.5 bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
  >
                {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>{processing ? "Querying NIMC Switch..." : "Verify NIN Now (₦150)"}</span>
              </button>
            </div>
          </form>

          {renderResultCard(ninResult, "Download NIMC Slip")}
        </div>}

      {
    /* 2. BVN VERIFICATION */
  }
      {activeService === "bvn-verification" && <div className="space-y-5">
          <form onSubmit={handleVerifyBvn} className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4 text-left">
            <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#252525]">NIBSS Bank Verification Number (BVN) Lookup</h4>
                <p className="text-xs text-gray-500">Real-time CBN Tier-3 KYC compliance and watchlist screening</p>
              </div>
              <button
    type="button"
    onClick={() => {
      setBvnNumber("22489103745");
      setBvnPhone("08035559812");
    }}
    className="text-[11px] font-bold text-[#176B37] bg-[#EAF3ED] px-2.5 py-1 rounded-lg hover:bg-emerald-100 cursor-pointer"
  >
                Fill Sample BVN
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">11-Digit BVN *</label>
                <input
    type="text"
    maxLength={11}
    required
    value={bvnNumber}
    onChange={(e) => setBvnNumber(e.target.value)}
    placeholder="e.g., 22489103745"
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] font-mono focus:outline-hidden focus:border-[#176B37]"
  />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Primary Bank / Fintech</label>
                <select
    value={bvnBank}
    onChange={(e) => setBvnBank(e.target.value)}
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
  >
                  <option>Moniepoint MFB</option>
                  <option>OPay Digital Services</option>
                  <option>Access Bank Plc</option>
                  <option>GTBank Plc</option>
                  <option>Zenith Bank Plc</option>
                  <option>First Bank of Nigeria</option>
                  <option>UBA Plc</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Registered Phone</label>
                <input
    type="tel"
    value={bvnPhone}
    onChange={(e) => setBvnPhone(e.target.value)}
    placeholder="0803..."
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] font-mono focus:outline-hidden focus:border-[#176B37]"
  />
              </div>
            </div>

            <div className="flex justify-start">
              <button
    type="submit"
    disabled={processing}
    className="px-6 py-2.5 bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
  >
                {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{processing ? "Checking NIBSS Registry..." : "Verify BVN via NIBSS (₦100)"}</span>
              </button>
            </div>
          </form>

          {renderResultCard(bvnResult, "Download KYC Report")}
        </div>}

      {
    /* 3. VOTER'S CARD VERIFICATION */
  }
      {activeService === "voters-card" && <div className="space-y-5">
          <form onSubmit={handleVerifyVotersCard} className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4 text-left">
            <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#252525]">INEC Permanent Voter&apos;s Card (PVC) Verification</h4>
                <p className="text-xs text-gray-500">Confirm VIN validity, polling unit delimitation, and identity match</p>
              </div>
              <button
    type="button"
    onClick={() => {
      setVinNumber("90F5B12849203819204");
      setVoterSurname(operatorName.split(" ")[0] || "CHINEDU");
    }}
    className="text-[11px] font-bold text-[#176B37] bg-[#EAF3ED] px-2.5 py-1 rounded-lg hover:bg-emerald-100 cursor-pointer"
  >
                Fill Sample VIN
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Voter Identification Number (VIN) *</label>
                <input
    type="text"
    required
    value={vinNumber}
    onChange={(e) => setVinNumber(e.target.value)}
    placeholder="e.g., 90F5B12849203819204"
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] font-mono uppercase focus:outline-hidden focus:border-[#176B37]"
  />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Registered State</label>
                <select
    value={voterState}
    onChange={(e) => setVoterState(e.target.value)}
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
  >
                  {NIGERIAN_STATES.map((st) => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Cardholder Surname</label>
                <input
    type="text"
    value={voterSurname}
    onChange={(e) => setVoterSurname(e.target.value)}
    placeholder="Surname on PVC"
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
  />
              </div>
            </div>

            <div className="flex justify-start">
              <button
    type="submit"
    disabled={processing}
    className="px-6 py-2.5 bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
  >
                {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <IdCard className="w-4 h-4" />}
                <span>{processing ? "Checking INEC Register..." : "Verify Voter's Card (₦150)"}</span>
              </button>
            </div>
          </form>

          {renderResultCard(voterResult, "Download PVC Slip")}
        </div>}

      {
    /* 4. ATTESTATION */
  }
      {activeService === "attestation" && <div className="space-y-5">
          <form onSubmit={handleGenerateAttestation} className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4 text-left">
            <div className="pb-3 border-b border-gray-100">
              <h4 className="font-bold text-sm text-[#252525]">Official AMMON Identity & Good Standing Attestation</h4>
              <p className="text-xs text-gray-500">Issue stamped RC 80540 attestation letter for banks, regulators, or statutory compliance</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Attestation Category *</label>
                <select
    value={attestType}
    onChange={(e) => setAttestType(e.target.value)}
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
  >
                  <option>Operator Good Standing & Regulatory Attestation</option>
                  <option>CBN / Commercial Bank Agent Onboarding Attestation</option>
                  <option>LGA Tax Exemption & Kiosk Operation Attestation</option>
                  <option>Court / Surety Identity & Residency Attestation</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Addressed To (Recipient Authority) *</label>
                <input
    type="text"
    required
    value={attestRecipient}
    onChange={(e) => setAttestRecipient(e.target.value)}
    placeholder="e.g., Central Bank of Nigeria / Commercial Bank"
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
  />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-gray-700 mb-1">Supporting Document Upload (Optional)</label>
              <label className="flex items-center justify-between gap-2 p-3 rounded-xl border border-dashed border-[#176B37]/40 bg-[#EAF3ED]/30 hover:bg-[#EAF3ED]/60 cursor-pointer transition-colors">
                <span className="flex items-center gap-2 text-[#176B37] font-semibold">
                  {attestFileName ? <Paperclip className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                  <span>{attestFileName || "Attach supporting ID, CAC document, or request letter from device"}</span>
                </span>
                <input
    type="file"
    className="hidden"
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (file) setAttestFileName(file.name);
    }}
  />
                <span className="text-[10px] font-bold px-2 py-0.5 bg-white rounded border border-[#E5E7EB] text-gray-600">
                  Browse
                </span>
              </label>
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-gray-700 mb-1">Purpose / Official Reference Notes</label>
              <textarea
    rows={2}
    value={attestPurpose}
    onChange={(e) => setAttestPurpose(e.target.value)}
    placeholder="Describe institutional purpose or terminal deployment details..."
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
  />
            </div>

            <div className="flex justify-start">
              <button
    type="submit"
    disabled={processing}
    className="px-6 py-2.5 bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
  >
                {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-4 h-4" />}
                <span>{processing ? "Signing Official Attestation..." : "Generate Official Attestation Letter"}</span>
              </button>
            </div>
          </form>

          {renderResultCard(attestResult, "Download Attestation Letter")}
        </div>}

      {
    /* 5. DRIVER'S LICENSE VERIFICATION */
  }
      {activeService === "drivers-license" && <div className="space-y-5">
          <form onSubmit={handleVerifyDriversLicense} className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4 text-left">
            <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#252525]">FRSC National Driver&apos;s License Verification</h4>
                <p className="text-xs text-gray-500">Verify license authenticity, validity dates, and vehicle class with FRSC</p>
              </div>
              <button
    type="button"
    onClick={() => setDlNumber("LAG04921AA12")}
    className="text-[11px] font-bold text-[#176B37] bg-[#EAF3ED] px-2.5 py-1 rounded-lg hover:bg-emerald-100 cursor-pointer"
  >
                Fill Sample License
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">FRSC License Number *</label>
                <input
    type="text"
    required
    value={dlNumber}
    onChange={(e) => setDlNumber(e.target.value)}
    placeholder="e.g., LAG04921AA12"
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] font-mono uppercase focus:outline-hidden focus:border-[#176B37]"
  />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Date of Birth *</label>
                <input
    type="date"
    required
    value={dlDob}
    onChange={(e) => setDlDob(e.target.value)}
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
  />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Issuing State</label>
                <select
    value={dlState}
    onChange={(e) => setDlState(e.target.value)}
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
  >
                  {NIGERIAN_STATES.map((st) => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-start">
              <button
    type="submit"
    disabled={processing}
    className="px-6 py-2.5 bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
  >
                {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Car className="w-4 h-4" />}
                <span>{processing ? "Checking FRSC Portal..." : "Verify Driver's License (₦200)"}</span>
              </button>
            </div>
          </form>

          {renderResultCard(dlResult, "Download FRSC Slip")}
        </div>}

      {
    /* 6. JAMB PIN VENDING */
  }
      {activeService === "jamb-pin" && <div className="space-y-5">
          <form onSubmit={handleVendJambPin} className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4 text-left">
            <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#252525]">JAMB UTME & Direct Entry e-PIN Vending</h4>
                <p className="text-xs text-gray-500">Instant official JAMB PIN generation with ₦250 operator commission per PIN</p>
              </div>
              <button
    type="button"
    onClick={() => {
      setJambProfileCode("4920184732");
      setJambCandidate("Amina Bello");
      setJambPhone("08091234567");
    }}
    className="text-[11px] font-bold text-[#176B37] bg-[#EAF3ED] px-2.5 py-1 rounded-lg hover:bg-emerald-100 cursor-pointer"
  >
                Fill Sample Candidate
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">JAMB Exam Product *</label>
                <select
    value={jambType}
    onChange={(e) => setJambType(e.target.value)}
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
  >
                  <option>UTME Regular (₦6,200)</option>
                  <option>UTME with Mock (₦7,700)</option>
                  <option>Direct Entry (DE) (₦5,700)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">10-Digit Candidate Profile Code *</label>
                <input
    type="text"
    maxLength={10}
    required
    value={jambProfileCode}
    onChange={(e) => setJambProfileCode(e.target.value)}
    placeholder="e.g., 4920184732"
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] font-mono focus:outline-hidden focus:border-[#176B37]"
  />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Candidate Full Name</label>
                <input
    type="text"
    value={jambCandidate}
    onChange={(e) => setJambCandidate(e.target.value)}
    placeholder="Full Name"
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
  />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input
    type="tel"
    value={jambPhone}
    onChange={(e) => setJambPhone(e.target.value)}
    placeholder="080..."
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] font-mono focus:outline-hidden focus:border-[#176B37]"
  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Quantity</label>
                  <select
    value={jambQty}
    onChange={(e) => setJambQty(Number(e.target.value))}
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
  >
                    {[1, 2, 3, 4, 5].map((q) => <option key={q} value={q}>{q} PIN{q > 1 ? "s" : ""}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-start">
              <button
    type="submit"
    disabled={processing}
    className="px-6 py-2.5 bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
  >
                {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
                <span>{processing ? "Generating JAMB e-PIN..." : "Vend JAMB e-PIN Now"}</span>
              </button>
            </div>
          </form>

          {renderResultCard(jambResult, "Download JAMB PIN Receipt")}
        </div>}

      {
    /* 7. WAEC PIN VENDING */
  }
      {activeService === "waec-pin" && <div className="space-y-5">
          <form onSubmit={handleVendWaecPin} className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4 text-left">
            <div className="pb-3 border-b border-gray-100">
              <h4 className="font-bold text-sm text-[#252525]">WAEC Result Checker & Registration e-PIN</h4>
              <p className="text-xs text-gray-500">Generate instant WAEC scratch-card e-PINs and Serial Numbers for candidates</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">WAEC Pin Type *</label>
                <select
    value={waecType}
    onChange={(e) => setWaecType(e.target.value)}
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
  >
                  <option>WAEC Result Checker e-PIN (₦3,800)</option>
                  <option>WAEC GCE Registration PIN (₦27,500)</option>
                  <option>WAEC Result Verification PIN (₦4,200)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Quantity</label>
                <select
    value={waecQty}
    onChange={(e) => setWaecQty(Number(e.target.value))}
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
  >
                  {[1, 2, 3, 5, 10].map((q) => <option key={q} value={q}>{q} PIN{q > 1 ? "s" : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Candidate / Customer Name</label>
                <input
    type="text"
    value={waecCandidate}
    onChange={(e) => setWaecCandidate(e.target.value)}
    placeholder="Optional candidate name"
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] focus:outline-hidden focus:border-[#176B37]"
  />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Customer Phone Number</label>
                <input
    type="tel"
    value={waecPhone}
    onChange={(e) => setWaecPhone(e.target.value)}
    placeholder="080..."
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] font-mono focus:outline-hidden focus:border-[#176B37]"
  />
              </div>
            </div>

            <div className="flex justify-start">
              <button
    type="submit"
    disabled={processing}
    className="px-6 py-2.5 bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
  >
                {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                <span>{processing ? "Issuing WAEC e-PIN..." : "Generate WAEC e-PIN"}</span>
              </button>
            </div>
          </form>

          {renderResultCard(waecResult, "Download WAEC PIN Receipt")}
        </div>}

      {
    /* 8. BILL PAYMENT */
  }
      {activeService === "bill-payment" && <div className="space-y-5">
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4 text-left">
            <div className="pb-3 border-b border-gray-100">
              <h4 className="font-bold text-sm text-[#252525]">Utility & Bill Payment Terminal</h4>
              <p className="text-xs text-gray-500">Pay Electricity DisCos, Cable TV subscriptions, Airtime/Data, and Water bills</p>
            </div>

            {
    /* Category Selector Tabs - Left Aligned */
  }
            <div className="flex flex-wrap items-center gap-2">
              {[
    { id: "electricity", label: "Electricity DisCos", icon: Zap },
    { id: "cable", label: "Cable TV", icon: Tv },
    { id: "airtime", label: "Airtime & Data", icon: Smartphone },
    { id: "water", label: "Water & Levy", icon: Droplets }
  ].map((tab) => {
    const TabIcon = tab.icon;
    const active = billCategory === tab.id;
    return <button
      key={tab.id}
      type="button"
      onClick={() => handleBillCategoryChange(tab.id)}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${active ? "bg-[#176B37] text-white shadow-xs" : "bg-[#EAF3ED]/60 text-[#176B37] hover:bg-[#EAF3ED]"}`}
    >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>;
  })}
            </div>

            <form onSubmit={handlePayBill} className="space-y-4 text-xs pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Service Provider / Biller *</label>
                  <select
    value={billProvider}
    onChange={(e) => setBillProvider(e.target.value)}
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
  >
                    {billCategory === "electricity" && <>
                        <option>EKEDC Prepaid (Eko Electric)</option>
                        <option>IKEDC Prepaid (Ikeja Electric)</option>
                        <option>AEDC Prepaid (Abuja Electric)</option>
                        <option>IBEDC Prepaid (Ibadan Electric)</option>
                        <option>EEDC Prepaid (Enugu Electric)</option>
                        <option>PHED Prepaid (Port Harcourt)</option>
                      </>}
                    {billCategory === "cable" && <>
                        <option>DStv Compact Bouquet</option>
                        <option>DStv Confam / Yanga</option>
                        <option>GOtv Max / Jolli</option>
                        <option>StarTimes Classic</option>
                      </>}
                    {billCategory === "airtime" && <>
                        <option>MTN Nigeria VTU / Data</option>
                        <option>Airtel Nigeria VTU / Data</option>
                        <option>Glo Mobile VTU / Data</option>
                        <option>9mobile VTU</option>
                      </>}
                    {billCategory === "water" && <>
                        <option>Lagos Water Corporation (LWC)</option>
                        <option>FCT Water Board Abuja</option>
                        <option>LAWMA Commercial Waste</option>
                      </>}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    {billCategory === "electricity" ? "Meter Number *" : billCategory === "cable" ? "Smartcard / IUC Number *" : billCategory === "airtime" ? "Phone Number *" : "Customer Account ID *"}
                  </label>
                  <div className="flex gap-2">
                    <input
    type="text"
    required
    value={billAccount}
    onChange={(e) => {
      setBillAccount(e.target.value);
      setBillCustomerVerified(null);
    }}
    placeholder={billCategory === "electricity" ? "e.g., 45029184721" : "Enter account / phone"}
    className="flex-1 p-2.5 rounded-xl border border-[#E5E7EB] font-mono focus:outline-hidden focus:border-[#176B37]"
  />
                    <button
    type="button"
    onClick={() => {
      if (!billAccount.trim()) setBillAccount("45029184721");
      setBillCustomerVerified(`${operatorName.toUpperCase()} (${stateLocation})`);
    }}
    className="px-3 py-2 bg-[#EAF3ED] text-[#176B37] font-bold rounded-xl hover:bg-emerald-100 cursor-pointer shrink-0"
  >
                      Validate
                    </button>
                  </div>
                  {billCustomerVerified && <p className="text-[11px] text-[#176B37] font-semibold mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified Account: {billCustomerVerified}
                    </p>}
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Amount (₦) *</label>
                  <input
    type="number"
    min={100}
    required
    value={billAmount}
    onChange={(e) => setBillAmount(e.target.value)}
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] font-mono focus:outline-hidden focus:border-[#176B37]"
  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Settlement Source</label>
                  <select
    value={billMethod}
    onChange={(e) => setBillMethod(e.target.value)}
    className="w-full p-2.5 rounded-xl border border-[#E5E7EB] bg-white focus:outline-hidden focus:border-[#176B37]"
  >
                    <option>AMMON Agent Float Wallet</option>
                    <option>Paystack Instant Checkout</option>
                    <option>NIBSS Direct Debit</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-start">
                <button
    type="submit"
    disabled={processing}
    className="px-6 py-2.5 bg-[#176B37] hover:bg-[#14532D] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
  >
                  {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  <span>{processing ? "Processing Bill Payment..." : `Pay ₦${Number(billAmount || 0).toLocaleString()} Now`}</span>
                </button>
              </div>
            </form>
          </div>

          {renderResultCard(billResult, "Download Customer Receipt")}
        </div>}

      {
    /* Recent Audit Log Table for Active Service (Left-Justified) */
  }
      <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs text-left">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
          <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500">
            Recent {currentMeta.label} History ({activeLogs.length})
          </h4>
          <span className="text-[10px] font-mono text-[#176B37] bg-[#EAF3ED] px-2 py-0.5 rounded">
            Saved to Session Ledger
          </span>
        </div>

        {activeLogs.length === 0 ? <p className="text-xs text-gray-400 py-3">
            No {currentMeta.label.toLowerCase()} transactions recorded yet in this session. Submit the form above to generate an official record.
          </p> : <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-bold uppercase text-gray-400">
                  <th className="py-2 pr-3">Reference</th>
                  <th className="py-2 pr-3">Subject / Details</th>
                  <th className="py-2 pr-3">Fee / Amount</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeLogs.map((log) => <tr key={log.id} className="hover:bg-[#EAF3ED]/30">
                    <td className="py-2.5 pr-3 font-mono font-bold text-[#176B37]">{log.reference}</td>
                    <td className="py-2.5 pr-3 text-[#252525] font-medium">{log.subject}</td>
                    <td className="py-2.5 pr-3 font-mono font-semibold">{log.amount}</td>
                    <td className="py-2.5 pr-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF3ED] text-[#176B37]">
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-400 font-mono text-[11px]">{log.timestamp}</td>
                  </tr>)}
              </tbody>
            </table>
          </div>}
      </div>
    </div>;
};
export {
  DASHBOARD_SERVICES_MENU,
  DashboardServicesWorkspace
};
