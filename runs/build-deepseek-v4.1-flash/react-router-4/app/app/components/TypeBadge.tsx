import { Link } from "react-router";

type Props = {
  name: string;
  label?: string;
  link?: boolean;
};

export function TypeBadge({ name, label, link = false }: Props) {
  const text = label ?? name;
  const style = { backgroundColor: `var(--type-${name}, #555e6b)` };
  if (link) {
    return (
      <Link to={`/types/${name}`} className="type-badge" style={style}>
        {text}
      </Link>
    );
  }
  return (
    <span className="type-badge" style={style}>
      {text}
    </span>
  );
}
