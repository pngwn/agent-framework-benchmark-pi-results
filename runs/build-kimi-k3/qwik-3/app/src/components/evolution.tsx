import { component$ } from "@builder.io/qwik";
import { humanize } from "../lib/format";

export interface EvoNode {
  name: string;
  children: EvoNode[];
}

/** Renders an evolution chain as a nested list. */
export const EvolutionTree = component$<{ node: EvoNode }>(({ node }) => (
  <li>
    <a href={`/pokemon/${node.name}`}>{humanize(node.name)}</a>
    {node.children.length > 0 && (
      <ul>
        {node.children.map((child) => (
          <EvolutionTree key={child.name} node={child} />
        ))}
      </ul>
    )}
  </li>
));
