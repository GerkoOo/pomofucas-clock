export default function Banner({ text, type, visible }) {
  return (
    <div className={`banner ${visible ? 'show' : ''} ${type || ''}`}>
      {text}
    </div>
  );
}
