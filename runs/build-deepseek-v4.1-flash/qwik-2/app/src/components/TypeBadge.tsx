import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";

export const TypeBadge = component$<{
  name: string;
  label: string;
  link?: boolean;
  size?: "small" | "large";
}>(({ name, label, link, size }) => {
  const className = `type-badge${size === "large" ? " type-badge-large" : ""}`;
  if (link) {
    return (
      <Link className={className} data-type={name} href={`/types/${name}`}>
        {label}
      </Link>
    );
  }
  return (
    <span className={className} data-type={name}>
      {label}
    </span>
  );
});
