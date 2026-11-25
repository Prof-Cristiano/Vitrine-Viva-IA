import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const source = await readFile(new URL("../public/studio.js", import.meta.url), "utf8");

function criarAmbiente() {
  const elementos = new Map();
  const desenhos = [];
  const ctx = {
    fillRect(...args) { desenhos.push(["fillRect", ...args]); },
    drawImage(...args) { desenhos.push(["drawImage", ...args]); },
    fillText(...args) { desenhos.push(["fillText", ...args]); },
    measureText(texto) { return { width: texto.length * 22 }; },
    save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}
  };
  function elemento(id) {
    if (!elementos.has(id)) {
      const eventos = {};
      elementos.set(id, {
        value: id === "estudio-formato" ? "post" : "",
        dataset: {},
        eventos,
        addEventListener(tipo, funcao) { eventos[tipo] = funcao; },
        disparar(tipo) { eventos[tipo]({}); },
        getContext() { return ctx; },
        toBlob(callback) { callback({ size: 10 }); }
      });
    }
    return elementos.get(id);
  }
  const document = {
    querySelector(seletor) { return elemento(seletor.slice(1)); },
    createElement() { return { click() {} }; }
  };
  const estudio = runInNewContext(`${source}\ncriarEstudio()`, {
    document,
    URL: { createObjectURL() { return "blob:test"; }, revokeObjectURL() {} },
    setTimeout() {}
  });
  estudio.definirTextos({ estabelecimento: "Café" }, {
    headline: "Bolo do dia",
    landingText: "Feito no local",
    story: "Experimente"
  });
  estudio.definirImagem({ naturalWidth: 800, naturalHeight: 600 });
  return { estudio, elemento, desenhos };
}

test("mantém edições por formato e usa os novos textos apenas em formatos ainda não editados", () => {
  const { estudio, elemento } = criarAmbiente();
  const chamada = elemento("estudio-chamada");
  chamada.value = "Chamada revisada";
  chamada.disparar("input");
  estudio.definirTextos({ estabelecimento: "Outro negócio" }, {
    headline: "Nova chamada", landingText: "Outro texto", story: "Novo story"
  });
  const formato = elemento("estudio-formato");
  formato.value = "story";
  formato.disparar("change");
  assert.equal(chamada.value, "Nova chamada");
  assert.equal(elemento("estudio-texto").value, "Novo story");
  formato.value = "post";
  formato.disparar("change");
  assert.equal(chamada.value, "Chamada revisada");
});

test("recorta a imagem original e bloqueia a exportação quando o texto não cabe", () => {
  const { elemento, desenhos } = criarAmbiente();
  const zoom = elemento("estudio-zoom");
  zoom.value = "150";
  zoom.disparar("input");
  const imagemAntes = desenhos.filter(([tipo]) => tipo === "drawImage").at(-1);
  const x = elemento("estudio-x");
  x.value = "0";
  x.disparar("input");
  const imagemDepois = desenhos.filter(([tipo]) => tipo === "drawImage").at(-1);
  assert.ok(imagemAntes[2] > imagemDepois[2]);
  const rodape = desenhos.filter(([tipo]) => tipo === "fillRect").at(-1);
  assert.ok(imagemDepois[7] + imagemDepois[9] < rodape[2]);

  const chamada = elemento("estudio-chamada");
  chamada.value = "Muito longo ".repeat(100);
  chamada.disparar("input");
  assert.equal(elemento("estudio-baixar").disabled, true);
  assert.match(elemento("estudio-status").textContent, /Encurte/);
  chamada.value = "Bolo";
  chamada.disparar("input");
  assert.equal(elemento("estudio-baixar").disabled, false);
});

test("informa falha de exportação e permite tentar novamente", () => {
  const { elemento } = criarAmbiente();
  elemento("estudio-previa").toBlob = (callback) => callback(null);
  elemento("estudio-baixar").disparar("click");
  assert.match(elemento("estudio-status").textContent, /Não foi possível/);
  assert.equal(elemento("estudio-baixar").disabled, false);
});
