import { component$ } from "@builder.io/qwik";
import { QwikCityProvider, RouterOutlet } from "@builder.io/qwik-city";
import { RouterHead } from "./components/router-head/router-head";
import "./global.css";

export default component$(() => {
  return (
    <QwikCityProvider>
      <head>
        <meta charset="utf-8" />
        <script
          dangerouslySetInnerHTML={
            'window.qwikevents = window.qwikevents || []; window.qwikevents.push("click","input","change","mouseover","focus","qvisible","qidle");'
          }
        />
        <RouterHead />
      </head>
      <body>
        <RouterOutlet />
      </body>
    </QwikCityProvider>
  );
});
