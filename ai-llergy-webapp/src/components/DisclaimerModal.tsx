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
          Our menu may contain allergens. Please inform your server of any
          dietary restrictions. Consumption of raw or undercooked ingredients
          may increase risk of foodborne illness. While we take every
          precaution, cross-contamination is possible.
        </p>
        <button className="btn primary-btn" onClick={onAgree}>
          I Agree
        </button>
      </div>
    </div>
  );
}
