const i18n = {
  de: {
    "nav.about": "Über uns",
    "nav.join": "Bewerben",
    "hero.title": "Maygasse Finance Society",
    "hero.subtitle": "Excellence in Financial Education. Leadership. Responsibility.",
    "hero.btnAbout": "Über uns entdecken",
    "hero.btnJoin": "Mitglied werden",
    "sections.headline": "Akademisches Profil",
    "vision.title": "Vision & Zielsetzung",
    "vision.text": "Förderung finanzieller Bildung durch praxisnahe Auseinandersetzung mit Wirtschaft, Kapitalmärkten und verantwortungsbewusstem Vermögensaufbau.",
    "learning.title": "Lernziele",
    "learning.1": "Aktien, ETFs, Anleihen verstehen",
    "learning.2": "Marktanalysen interpretieren",
    "learning.3": "Portfolioverwaltung",
    "learning.4": "Unternehmensbewertung",
    "learning.5": "Präsentations- & Teamfähigkeiten",
    "learning.6": "Langfristiges Denken und Risikobewusstsein",
    "activities.title": "Aktivitäten",
    "activities.1": "Aktie/ETF der Woche",
    "activities.2": "Markt-Updates",
    "activities.3": "Portfolio-Challenges",
    "activities.4": "Workshops (Excel, ETFs, Budgetplanung)",
    "activities.5": "Gastvorträge",
    "activities.6": "Business- & Startup-Pitches",
    "activities.7": "Fallstudien und Wettbewerbe",
    "org.title": "Organisation",
    "org.1": "Präsidium",
    "org.2": "Research Team",
    "org.3": "Education Team",
    "org.4": "Event Team",
    "org.5": "Kommunikation/Marketing",
    "plan.title": "Jahresplan",
    "plan.1": "Weekly: Marktupdate & Workshops",
    "plan.2": "Monthly: Gastvorträge oder Wettbewerbe",
    "plan.3": "Halbjährlich: Exkursion",
    "plan.4": "Jährlich: Große Investment-Challenge",
    "prestige.text": "A student-led academic society dedicated to excellence, discipline and long-term thinking.",
    "cta.title": "Become part of the next generation of responsible leaders.",
    "cta.button": "Jetzt bewerben",
    "modal.title": "Bewerbung & Mitgliedschaft",
    "modal.text": "Wir freuen uns über engagierte Schülerinnen und Schüler, die mit Disziplin, Integrität und langfristigem Denken Verantwortung übernehmen möchten.",
    "form.name": "Name",
    "form.class": "Klasse",
    "form.cv": "Resume/CV",
    "form.motivation": "Motivation",
    "form.message": "Nachricht",
    "form.submit": "Jetzt bewerben",
    "form.sending": "Bewerbung wird gesendet...",
    "form.success": "Vielen Dank! Deine Bewerbung wurde versendet.",
    "form.error": "Senden fehlgeschlagen. Bitte später erneut versuchen oder direkt per E-Mail kontaktieren."
  },
  en: {
    "nav.about": "About",
    "nav.join": "Apply",
    "hero.title": "Maygasse Finance Society",
    "hero.subtitle": "Excellence in Financial Education. Leadership. Responsibility.",
    "hero.btnAbout": "Discover About Us",
    "hero.btnJoin": "Become a Member",
    "sections.headline": "Academic Profile",
    "vision.title": "Vision & Purpose",
    "vision.text": "Promoting financial literacy through practical engagement with economics, capital markets, and responsible long-term wealth building.",
    "learning.title": "Learning Objectives",
    "learning.1": "Understand stocks, ETFs, and bonds",
    "learning.2": "Interpret market analyses",
    "learning.3": "Portfolio management",
    "learning.4": "Company valuation",
    "learning.5": "Presentation & teamwork skills",
    "learning.6": "Long-term thinking and risk awareness",
    "activities.title": "Activities",
    "activities.1": "Stock/ETF of the Week",
    "activities.2": "Market updates",
    "activities.3": "Portfolio challenges",
    "activities.4": "Workshops (Excel, ETFs, budgeting)",
    "activities.5": "Guest lectures",
    "activities.6": "Business & startup pitches",
    "activities.7": "Case studies and competitions",
    "org.title": "Organization",
    "org.1": "Presidium",
    "org.2": "Research Team",
    "org.3": "Education Team",
    "org.4": "Event Team",
    "org.5": "Communication/Marketing",
    "plan.title": "Annual Plan",
    "plan.1": "Weekly: Market update & workshops",
    "plan.2": "Monthly: Guest lectures or competitions",
    "plan.3": "Biannual: Excursion",
    "plan.4": "Annual: Major investment challenge",
    "prestige.text": "A student-led academic society dedicated to excellence, discipline and long-term thinking.",
    "cta.title": "Become part of the next generation of responsible leaders.",
    "cta.button": "Apply now",
    "modal.title": "Application & Membership",
    "modal.text": "We welcome committed students who want to take responsibility with discipline, integrity, and long-term thinking.",
    "form.name": "Name",
    "form.class": "Class",
    "form.cv": "Resume/CV",
    "form.motivation": "Motivation",
    "form.message": "Message",
    "form.submit": "Apply now",
    "form.sending": "Sending application...",
    "form.success": "Thank you! Your application has been sent.",
    "form.error": "Sending failed. Please try again later or contact us via email."
  }
};

const langBtn = document.getElementById("langToggle");
const modal = document.getElementById("applicationModal");
const closeModalBtn = document.getElementById("closeModal");
const openModalBtns = document.querySelectorAll(".open-application");
const applicationForm = document.getElementById("applicationForm");
const formStatus = document.getElementById("formStatus");
let currentLang = "de";

const t = (key) => i18n[currentLang][key] || key;

const setLanguage = (lang) => {
  currentLang = lang;
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (i18n[lang][key]) node.textContent = i18n[lang][key];
  });
  langBtn.textContent = lang === "de" ? "EN" : "DE";
};

const openModal = () => {
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
};

const closeModal = () => {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
};

langBtn.addEventListener("click", () => {
  setLanguage(currentLang === "de" ? "en" : "de");
});

openModalBtns.forEach((button) => button.addEventListener("click", openModal));
closeModalBtn.addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});

applicationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formStatus.textContent = t("form.sending");

  try {
    const payload = new FormData(applicationForm);
    const response = await fetch("/api/apply", {
      method: "POST",
      body: payload
    });

    if (!response.ok) throw new Error("request_failed");

    formStatus.textContent = t("form.success");
    applicationForm.reset();
  } catch (error) {
    formStatus.textContent = t("form.error");
  }
});

setLanguage("de");

const accordionItems = document.querySelectorAll(".accordion-item");
accordionItems.forEach((item) => {
  const trigger = item.querySelector(".accordion-trigger");
  trigger.addEventListener("click", () => {
    const isOpen = item.classList.contains("open");
    accordionItems.forEach((entry) => {
      entry.classList.remove("open");
      entry.querySelector(".accordion-trigger").setAttribute("aria-expanded", "false");
    });
    if (!isOpen) {
      item.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
    }
  });
});
