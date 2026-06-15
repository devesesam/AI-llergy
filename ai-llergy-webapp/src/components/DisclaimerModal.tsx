"use client";

interface DisclaimerModalProps {
  isOpen: boolean;
  onAgree: () => void;
}

export default function DisclaimerModal({
  isOpen,
  onAgree,
}: DisclaimerModalProps) {
  return (
    <div className={`modal ${isOpen ? "active" : ""}`}>
      <div className="modal-content">
        <h1>Disclaimer</h1>
        <p>
          AI-lergy is designed to help you make a more informed dining choice,
          but it should be used as a guide only.
        </p>
        <p>
          Our food is prepared in a busy kitchen where allergens are present.
          While we follow best-practice food safety procedures, we cannot
          guarantee any item is free from allergens or trace cross-contact.
        </p>
        <p>
          Please tell our team about any allergy, intolerance, or dietary
          requirement before ordering, even if you have used this tool. Recipes
          and supplier ingredients are subject to change. Please ask our team
          any questions.
        </p>
        <button className="btn primary-btn" onClick={onAgree}>
          I Understand
        </button>
      </div>
    </div>
  );
}
