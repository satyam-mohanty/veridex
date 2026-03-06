export default function InputArea({ inputType, value, onChange, disabled }) {
  const placeholders = {
    email: 'Paste suspicious email content, message, or URL to analyze.',
    sms: 'Paste suspicious email content, message, or URL to analyze.',
    url: 'https://example.com/suspicious-link',
    'bulk-url': 'Paste one URL per line…\nhttps://example.com\nhttps://suspicious-site.xyz/login',
  };

  const placeholder = placeholders[inputType] || placeholders.email;

  const baseClasses =
    'w-full bg-transparent text-[14px] leading-relaxed text-(--text-primary) placeholder:text-(--text-tertiary) focus:outline-none disabled:opacity-40';

  if (inputType === 'url') {
    return (
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`${baseClasses} py-1`}
      />
    );
  }

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={inputType === 'bulk-url' ? 6 : 5}
      className={`${baseClasses} resize-none py-1`}
    />
  );
}
