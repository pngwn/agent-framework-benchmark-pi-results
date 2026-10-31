import { createEffect, JSX, splitProps } from "solid-js";

// A <select> whose value is applied after its options have rendered
// (Solid sets props before children exist, which drops the selection).
export function Select(props: JSX.SelectHTMLAttributes<HTMLSelectElement>) {
  const [local, rest] = splitProps(props, ["value", "children"]);
  let el!: HTMLSelectElement;
  createEffect(() => {
    const v = local.value;
    if (el && v != null) el.value = String(v);
  });
  return (
    <select {...rest} ref={(r) => (el = r)}>
      {local.children}
    </select>
  );
}
