import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="page">
      <h2 style={{ marginBottom: 20 }}>Contact</h2>
      <div className="contact-card">
        <div className="wave" style={{ fontSize: "1.6rem" }}>Let&apos;s talk 👋</div>
        <p style={{ marginTop: 10, color: "var(--text-2)" }}>
          Still curious? <Link href="/">Go back and ask my agent something</Link>, or reach me
          directly:
        </p>
        <div className="contact-links">
          <a className="clink" href="mailto:cameronmyuan@gmail.com">✉️ cameronmyuan@gmail.com</a>
          <a className="clink" href="https://linkedin.com/in/cameron-yuan" target="_blank" rel="noreferrer">
            💼 linkedin.com/in/cameron-yuan
          </a>
          <a className="clink" href="https://github.com/CamYuan" target="_blank" rel="noreferrer">
            🐙 github.com/CamYuan
          </a>
        </div>
      </div>
    </div>
  );
}
