/* eslint-disable no-restricted-globals */

import React, { Component } from "react";
import { findDOMNode } from "react-dom";
import merge from "lodash/merge";
import chunk from "lodash/chunk";
import zip from "lodash/zip";
import groupBy from "lodash/groupBy";
import memoize from "fast-memoize";
import moment from "moment";

// import './pure-min.css'; // breaks textareas and cell margins
import "./App.css";

import Column from "./components/Column";

const INITIAL_STATE = {
  bibs: {},
  chrono: [],
  tempi: [],
};

const savedStateStr = window.localStorage.getItem("state") || "{}";
const savedState = JSON.parse(savedStateStr);

const doubleConfirm = cb => {
  if (confirm("Vuoi veramente eliminare tutti i dati?")) {
    if (confirm("Sei sicuro di voler fare un reset completo?")) {
      cb();
    }
  }
};

const resetAll = () => {
  doubleConfirm(() => {
    window.localStorage.clear();
    window.location.reload();
  });
};

const findBibCategory = memoize((bibs, bib) => {
  const cats = Object.keys(bibs);
  let found = false;
  cats.forEach(catName => {
    if (found !== false) {
      return;
    }
    if (bibs[catName] && bibs[catName].indexOf(bib) !== -1) {
      found = catName;
    }
  });
  if (!found) {
    console.log("#" + bib + ": CATEGORIA MANCANTE (ignorato)");
  }
  return found;
});

const categoryAddBib = (category, bib) => state => {
  if (state.bibs[category].indexOf(bib) !== -1) {
    alert("Il concorrente è già in griglia");
    return state;
  }
  return merge(state, {
    bibs: {
      [category]: [].concat(state.bibs[category] || [], bib),
    },
  });
};

const categoryChangeBib = (category, lapNum0, index, nextValue) => state => {
  const oldBibs = state.bibs[category];
  const nextBibs = [
    ...oldBibs.slice(0, index),
    nextValue,
    ...oldBibs.slice(index + 1),
  ];
  return merge(state, {
    bibs: {
      [category]: nextBibs,
    },
  });
};

const resetCrono = state => {
  return {
    chrono: [],
    tempi: [],
    categoryFilter: [],
    lastBib: [],
  };
};

const addBib = bib => state => {
  if (bib === 0 || Number(bib) === 0) {
    return;
  }
  let categoryFilter = "";
  if (!state.alwaysShowAllCategories) {
    categoryFilter = findBibCategory(state.bibs, bib);
  }
  return {
    chrono: [].concat(state.chrono, bib),
    tempi: [].concat(state.tempi, Date.now()),
    categoryFilter,
    lastBib: bib,
  };
};

const removeLastBib = bib => state => {
  if (!bib) {
    bib = 9999;
  }
  if (!confirm(`Rimuovo l'ultimo giro del n.${bib}?`)) {
    return;
  }
  if (state.chrono.lastIndexOf(bib) === -1) {
    alert("Non posso eliminare l'ultimo giro perché non esiste: " + bib);
    return;
  }
  const removingIndex = state.chrono.lastIndexOf(bib);
  return {
    chrono: [
      ...state.chrono.slice(0, removingIndex),
      ...state.chrono.slice(removingIndex + 1),
    ],
    tempi: [
      ...state.tempi.slice(0, removingIndex),
      ...state.tempi.slice(removingIndex + 1),
    ],
  };
};

const removeLatest = () => state => {
  if (!confirm(`Rimuovo l'ultimo tempo registrato?`)) {
    return;
  }
  const removingIndex = state.chrono.length - 1;
  return {
    chrono: [
      ...state.chrono.slice(0, removingIndex),
      9999,
      ...state.chrono.slice(removingIndex + 1),
    ],
    tempi: [
      ...state.tempi.slice(0, removingIndex),
      ...state.tempi.slice(removingIndex + 1),
    ],
  };
};

const fixupLastBib = bib => state => {
  if (!bib) {
    bib = 9999;
  }
  if (state.chrono.lastIndexOf(bib) === -1) {
    alert("Non posso correggere l'ultimo giro perché non esiste: " + bib);
    return;
  }
  const next = Number(prompt("Sostituire con?", bib));
  if (!next) {
    return state;
  }
  const updatingBib = state.chrono.lastIndexOf(bib);
  return {
    chrono: [
      ...state.chrono.slice(0, updatingBib),
      next,
      ...state.chrono.slice(updatingBib + 1),
    ],
  };
};

const moveUpBib = bib => state => {
  if (!bib) {
    bib = 9999;
  }
  const updatingBibIndex = state.chrono.lastIndexOf(bib);
  const prevBibIndex = updatingBibIndex - 1;

  if (updatingBibIndex === -1) {
    alert("Non posso scambiare perché non esiste: " + bib);
    return;
  }

  if (!prevBibIndex) {
    return state;
  }

  return {
    chrono: [
      ...state.chrono.slice(0, updatingBibIndex - 1),
      state.chrono[updatingBibIndex],
      state.chrono[updatingBibIndex - 1],
      ...state.chrono.slice(updatingBibIndex + 1),
    ],
  };
};

const swapLastBibs = () => state => {
  const lastBib = state.chrono[state.chrono.length - 1];
  const prevBib = state.chrono[state.chrono.length - 2];
  return {
    chrono: [
      ...state.chrono.slice(0, state.chrono.length - 2),
      lastBib,
      prevBib,
    ],
  };
};

const insertBibTime = index => state => {
  const insertNew = (() => {
    if (
      confirm(
        "Premi OK per COPIARE questo tempo.\nPremi ANNULLA per MODIFICARE."
      )
    ) {
      return true;
    }
    return false;
  })();
  const bib = Number(
    prompt("PETTORALE?", insertNew ? "" : state.chrono[index])
  );
  if (!bib) {
    return state;
  }
  const suggestedTime = state.tempi[index]
    ? moment(state.tempi[index]).format("HHmmss.SSS")
    : "";
  const time = prompt("TEMPO? (hhmmss.dcm)", suggestedTime);
  if (!time) {
    return state;
  }
  const parsedTime = moment(time, "HHmmss.SSS").valueOf();
  if (!parsedTime) {
    alert("Errore: formato ora non valido, usa hhmmss.dcm");
    insertBibTime(index)(state);
    return;
  }
  if (parsedTime < state.tempi[index - 1]) {
    // alert('Attenzione: il tempo non dovrebbe essere inferiore al precedente');
    // insertBibTime(index)(state);
    // return;
  }
  if (parsedTime > state.tempi[index + 1]) {
    // alert('Attenzione: il tempo non dovrebbe essere superiore al sccessivo');
    // insertBibTime(index)(state);
    // return;
  }
  return {
    chrono: [
      ...state.chrono.slice(0, index),
      bib,
      ...state.chrono.slice(index + (insertNew ? 0 : 1)),
    ],
    tempi: [
      ...state.tempi.slice(0, index),
      parsedTime,
      ...state.tempi.slice(index + (insertNew ? 0 : 1)),
    ],
  };
};

const highlightBib = bib => state => {
  const highlight = bib;
  const ret = {
    ...state,
    highlight,
    lastBib: highlight,
  };

  if (!state.alwaysShowAllCategories) {
    const categoryFilter = findBibCategory(state.bibs, bib);
    ret.categoryFilter = categoryFilter;
  }

  return ret;
};

const formatTempo = memoize(t => moment(t).format("HH:mm:ss,SSS"));
const pad4 = b => {
  let str;
  if (b >= 1000) {
    str = "" + b;
  } else if (b >= 100) {
    str = "0" + b;
  } else if (b >= 10) {
    str = "00" + b;
  } else {
    str = "000" + b;
  }
  return str;
};

const chronoTable = memoize((bibsList, tempi) => {
  const bibsStr = bibsList.map((b, index) => {
    let str;
    if (b >= 100) {
      str = "" + b;
    } else if (b >= 10) {
      str = " " + b;
    } else {
      str = "  " + b;
    }
    const tempo = formatTempo(tempi[index]);
    return [str, tempo, index];
  });
  const matRC = chunk(bibsStr, 10);
  const matCR = zip(...matRC);
  return matCR;
});

const getCategories = memoize(bibs => Object.keys(bibs));

const getChronoByCat = memoize((chrono, bibs) => {
  return groupBy(chrono, bib => findBibCategory(bibs, bib));
});

const shouldShowCategoryRanking = (state, cat) => {
  if (!state.categoryFilter) {
    return true;
  }
  return state.categoryFilter === cat;
};

document.addEventListener("keydown", e => {
  const bibInput = document.getElementById("bibGlobalInput");
  if (bibInput) {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }
    bibInput.focus();
  }
});

class App extends Component {
  constructor(props) {
    super(props);
    this.state = merge(INITIAL_STATE, savedState);
    this.handleCategoryAddBib = this.handleCategoryAddBib.bind(this);
    this.persistState = this.persistState.bind(this);
    this.handleSetCategories = this.handleSetCategories.bind(this);
    this.handleSetCategoriesFromList = this.handleSetCategoriesFromList.bind(
      this
    );
    this.handleClearCategories = this.handleClearCategories.bind(this);
    this.handleBibEvent = this.handleBibEvent.bind(this);
    this.handleBackupDownload = this.handleBackupDownload.bind(this);
    this.handleBackupUpload = this.handleBackupUpload.bind(this);
    this.handleClassifyDownload = this.handleClassifyDownload.bind(this);
    this.scrollChrono = this.scrollChrono.bind(this);
  }

  scrollChrono() {
    findDOMNode(this.scrollingArea).scrollLeft =
      Number.MAX_SAFE_INTEGER - Math.random();
  }

  componentDidMount() {
    this._persistInterval = setInterval(this.persistState, 500);
    this._backupInterval = setInterval(
      this.handleBackupDownload,
      10 * 60 * 1000
    );
    this.scrollChrono();
  }

  componentWillUnmount() {
    this.clearInterval(this._persistInterval);
    this.clearInterval(this._backupInterval);
  }

  persistState() {
    window.localStorage.setItem("state", JSON.stringify(this.state));
  }

  handleCategoryAddBib(e) {
    if (e.nativeEvent.keyCode !== 13) {
      return;
    }
    const bib = Number(e.target.value);
    e.target.value = "";
    const category = findBibCategory(this.state.bibs, bib);
    if (category === false) {
      return;
    }
    this.setState(categoryAddBib(category, bib));
  }

  handleBibEvent(e) {
    let bib = Number(e.target.value);

    if (
      e.nativeEvent.keyCode !== 13 &&
      e.nativeEvent.keyCode !== 109 &&
      e.nativeEvent.keyCode !== 189 &&
      e.nativeEvent.keyCode !== 106 &&
      !(e.nativeEvent.keyCode === 187 && e.nativeEvent.shiftKey) &&
      e.nativeEvent.keyCode !== 83 &&
      e.nativeEvent.keyCode !== 88 &&
      e.nativeEvent.keyCode !== 32 &&
      e.nativeEvent.keyCode !== 46 &&
      !(e.nativeEvent.keyCode === 219 && e.nativeEvent.shiftKey)
    ) {
      return;
    }

    e.target.value = "";

    if (
      e.nativeEvent.keyCode === 109 || // minus from keypad
      e.nativeEvent.keyCode === 189
    ) {
      // dash
      // subtract
      this.setState(removeLastBib(bib));
      e.preventDefault();
      return;
    }

    if (
      e.nativeEvent.keyCode === 106 ||
      (e.nativeEvent.keyCode === 187 && e.nativeEvent.shiftKey)
    ) {
      // multiply
      this.setState(fixupLastBib(bib));
      e.preventDefault();
      return;
    }

    if (e.nativeEvent.keyCode === 88) {
      this.setState(swapLastBibs());
      e.preventDefault();
      return;
    }

    if (e.nativeEvent.keyCode === 83) {
      this.setState(moveUpBib(bib));
      e.preventDefault();
      return;
    }

    if (e.nativeEvent.keyCode === 219 && e.nativeEvent.shiftKey) {
      this.setState(highlightBib(bib));
      e.preventDefault();
      return;
    }

    if (e.nativeEvent.keyCode === 32) {
      this.setState(
        e => ({ showChrono: !this.state.showChrono }),
        () => this.scrollChrono()
      );

      e.preventDefault();
      return;
    }
    if (e.nativeEvent.keyCode === 46) {
      this.setState(removeLatest());
      e.preventDefault();
      return;
    }

    if (!bib) {
      bib = 9999;
    }

    // if (!findBibCategory(this.state.bibs, bib)) {
    // maybe display category somewhere
    // }
    this.setState(addBib(bib));
    if (this.state.autoHighlightLastBib) {
      this.setState(highlightBib(bib));
    }
  }

  handleClearCategories(e) {
    e.preventDefault();
    if (!confirm("Confermi di voler ELIMINARE le categorie?")) {
      return;
    }
    this.setState(state => ({
      bibs: {},
    }));
  }

  handleSetCategories(e) {
    e.preventDefault();
    if (
      !confirm(
        "Le categorie precedenti verranno sovrascritte. Se vuoi cancellare o rinominare alcune categorie, utilizza prima il pulsante Elimina tutte. Confermi di voler impostare le categorie?"
      )
    ) {
      return;
    }
    // const currentCats = Object.keys(this.state.bibs);
    const requestedCats = findDOMNode(this._catsList)
      .value.split("\n")
      .map(c => c.trim().split(/\t|\s{2,}/));
    requestedCats.forEach(([cat, ...bibs]) => {
      if (!cat) {
        return;
      }
      const cleanCat = cat.trim().toUpperCase();
      this.setState(state => ({
        bibs: {
          ...state.bibs,
          [cleanCat]: [...bibs].map(b => Number(b)),
        },
      }));
    });
  }

  handleSetCategoriesFromList(e) {
    e.preventDefault();
    const acc = {};
    const requestedCats = findDOMNode(this._catsListConc)
      .value.split("\n")
      .map(c => c.trim().split("\t"));
    requestedCats.forEach(([pett, cat]) => {
      if (isNaN(pett)) {
        // cast to Number
        return;
      }
      if (!pett || !cat) {
        return;
      }
      if (!Array.isArray(acc[cat])) {
        acc[cat] = [];
      }
      acc[cat].push(pett);
    });
    findDOMNode(this._catsList).value = Object.keys(acc)
      .map(catName => {
        return [catName, ...acc[catName]].join("\t");
      })
      .join("\n");
    this.handleSetCategories(e);
  }

  handleBackupDownload(e) {
    if (e) {
      e.preventDefault();
    }
    const a = document.createElement("a");
    const blob = new Blob([JSON.stringify(this.state)], {
      type: "application/json",
    });
    a.href = window.URL.createObjectURL(blob);
    a.download = "backup-" + Date.now() + ".json";
    a.click();
  }

  handleBackupUpload(e) {
    e.preventDefault();
    const reader = new FileReader();
    reader.onload = e => {
      this.setState(JSON.parse(e.target.result));
    };
    reader.readAsText(e.target.files[0]);
  }

  handleClassifyDownload(e) {
    e.preventDefault();

    const prefisso = prompt(
      "Prefisso chip? (2 lettere + 1 numero)",
      window.localStorage.prefisso || "VG0"
    );
    if (!prefisso) {
      return;
    }

    window.localStorage.prefisso = prefisso;

    const obj = {};
    let maxLaps = 0;
    this.state.chrono.forEach((bib, index) => {
      if (!Array.isArray(obj[bib])) {
        obj[bib] = [];
      }
      obj[bib].push(formatTempo(this.state.tempi[index]));
      maxLaps = Math.max(maxLaps, obj[bib].length);
    });

    const header = ["LAP", "TOTAL", "TAG", "#", "NAME", "AGE GROUP"];
    for (let i = 1; i <= maxLaps; i++) {
      header.push("LAP " + i);
    }
    const rows = [header];
    Object.keys(obj).map(bib => {
      const tempi = obj[bib];
      const row = [
        tempi.length,
        tempi[tempi.length - 1],
        prefisso + "" + pad4(bib),
        bib,
        ",",
        findBibCategory(this.state.bibs, Number(bib)),
        ...tempi,
      ];
      rows.push(row);
      return;
    });

    const str = rows.map(r => r.join(";")).join("\n");

    const a = document.createElement("a");
    const blob = new Blob([str], { type: "text/csv" });
    a.href = window.URL.createObjectURL(blob);
    a.download = "classify-" + Date.now() + ".csv";
    a.click();
  }

  render() {
    const highlight = this.state.highlight;
    const categories = getCategories(this.state.bibs);
    const chrono = chronoTable(this.state.chrono, this.state.tempi);
    const chronoByCat = getChronoByCat(this.state.chrono, this.state.bibs);
    chronoByCat["ASSOLUTA"] = this.state.chrono;

    let contaGiri = -1;
    let lastPos = 0;
    let lastTime = 0;
    const highlighted = this.state.chrono
      .map((b, i) => {
        if (b !== highlight) {
          return false;
        }

        const tempo = this.state.tempi[i - 1];

        const posDiff = i + 1 - lastPos;
        const timeDiff = tempo - lastTime - 60 * 60 * 1000; // @BUG no idea why here we have 1h offset...
        lastPos = i + 1;
        lastTime = tempo;
        contaGiri++;

        return (
          <div className="pure-u-1-8" style={{ marginTop: 8 }}>
            <strong>{i + 1}°</strong> {formatTempo(tempo)}
            <br />
            {contaGiri !== 0 && (
              <em style={{ color: "brown" }}>
                <small>
                  +{posDiff}, giro: {formatTempo(timeDiff)}
                </small>
              </em>
            )}
          </div>
        );
      })
      .filter(Boolean);

    return (
      <div className="App">
        <div className="App-header">
          <div className="pure-g">
            <div className="pure-u-1-6">&nbsp;</div>
            <div className="pure-u-2-3">
              <h2>
                Numero:{" "}
                <input
                  id="bibGlobalInput"
                  type="number"
                  defaultValue=""
                  onKeyDown={e => {
                    this.handleBibEvent(e);
                    setTimeout(() => this.scrollChrono(), 1000);
                  }}
                />
              </h2>
              <div className="top-actions-container">
                <button
                  type="reset"
                  onClick={() =>
                    this.setState(e => ({ showConfig: !this.state.showConfig }))
                  }
                  style={{
                    backgroundColor: this.state.showConfig ? "green" : "gray",
                  }}
                >
                  Configurazione
                </button>
                <button
                  type="reset"
                  onClick={() =>
                    this.setState(e => ({ showChrono: !this.state.showChrono }))
                  }
                  style={{
                    backgroundColor: this.state.showChrono ? "green" : "gray",
                  }}
                >
                  Cronologico
                </button>
                <button
                  type="reset"
                  onClick={() =>
                    this.setState(e => ({
                      autoHighlightLastBib: !this.state.autoHighlightLastBib,
                    }))
                  }
                  style={{
                    backgroundColor: this.state.autoHighlightLastBib
                      ? "green"
                      : "gray",
                  }}
                >
                  Trova autom.
                </button>
                <button
                  type="reset"
                  onClick={() =>
                    this.setState(e => ({
                      alwaysShowAllCategories: !this.state
                        .alwaysShowAllCategories,
                    }))
                  }
                  style={{
                    backgroundColor: this.state.alwaysShowAllCategories
                      ? "gray"
                      : "green",
                  }}
                >
                  Selez. auto cat.
                </button>
                <button
                  type="reset"
                  onClick={() => this.setState(e => ({ categoryFilter: null }))}
                >
                  Mostra tutte cat.
                </button>

                <small>
                  (solo ultimi{" "}
                  <input
                    type="number"
                    value={this.state.showCategoryRankingFromLapNum || 0}
                    onChange={e =>
                      this.setState({
                        showCategoryRankingFromLapNum: Number(e.target.value),
                      })
                    }
                    style={{
                      width: 20,
                    }}
                  />{" "}
                  giri{" "}
                  <button
                    type="reset"
                    onClick={() =>
                      this.setState(e => ({
                        showCategoryRankingFromLapNum:
                          this.state.showCategoryRankingFromLapNum - 1,
                      }))
                    }
                  >
                    -
                  </button>
                  <button
                    type="reset"
                    onClick={() =>
                      this.setState(e => ({
                        showCategoryRankingFromLapNum:
                          this.state.showCategoryRankingFromLapNum + 1,
                      }))
                    }
                  >
                    +
                  </button>)
                </small>
              </div>
            </div>
            <div className="pure-u-1-6 help-container">
              <small>
                <strong>Scorciatoie</strong>
                <br />
                <table className="help">
                  <tbody>
                    <tr>
                      <th>
                        <em>num</em> ↵
                      </th>
                      <td>aggiungi</td>
                    </tr>
                    <tr>
                      <th>
                        <em>num</em> -
                      </th>
                      <td>rimuovi u.g.</td>
                    </tr>
                    <tr>
                      <th>
                        <em>num</em> *
                      </th>
                      <td>correggi u.g.</td>
                    </tr>
                    <tr>
                      <th>
                        <em>num</em> s
                      </th>
                      <td>sposta su</td>
                    </tr>
                    <tr>
                      <th>
                        <em>num</em> ?
                      </th>
                      <td>trova</td>
                    </tr>
                    <tr>
                      <th>canc</th>
                      <td>canc ult. abb.</td>
                    </tr>
                    <tr>
                      <th>x</th>
                      <td>scambia ultimi 2</td>
                    </tr>
                  </tbody>
                </table>
              </small>
            </div>
          </div>
        </div>

        <div className="header-spacer" />

        {this.state.showChrono && (
          <div
            className="chrono"
            style={{ width: window.innerWidth - 50, overflowX: "scroll" }}
            ref={_ref => (this.scrollingArea = _ref)}
          >
            <table className="table" style={{ maxWidth: "100%" }}>
              <tbody>
                {chrono.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map(
                      (cell, cellIndex) =>
                        cell && (
                          <td
                            key={cell[0] + "-" + cellIndex}
                            className="chrono-td"
                            style={{
                              verticalAlign: "middle",
                              fontFamily: "monospace",
                              textAlign: "right",
                              minWidth: 220,
                              backgroundColor:
                                Number(cell[0]) === highlight
                                  ? "orange"
                                  : undefined,
                            }}
                          >
                            <em style={{ color: "#444", fontSize: "0.7em" }}>
                              {cellIndex * 10 + rowIndex + 1}
                            </em>{" "}
                            <strong
                              onMouseOver={e => {
                                if (!this.state.autoHighlightLastBib) {
                                  this.setState(highlightBib()(this.state));
                                  return;
                                }
                                this.setState(
                                  highlightBib(Number(cell[0]))(this.state)
                                );
                              }}
                              onClick={e =>
                                this.setState(insertBibTime(cell[2]))
                              }
                              style={{
                                display: "inline-block",
                                width: 35,
                                textAlign: "right",
                                cursor: "pointer",
                                backgroundColor: findBibCategory(
                                  this.state.bibs,
                                  Number(cell[0])
                                )
                                  ? ""
                                  : "red",
                              }}
                            >
                              {cell[0]}
                            </strong>{" "}
                            <span
                              style={{
                                color: "blue",
                                backgroundColor:
                                  this.state.tempi[cell[2]] <
                                    this.state.tempi[cell[2] - 1] ||
                                  this.state.tempi[cell[2]] >
                                    this.state.tempi[cell[2] + 1]
                                    ? "red"
                                    : "",
                              }}
                            >
                              {cell[1]}
                            </span>
                            &nbsp; &nbsp;
                          </td>
                        )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <p>
            <span style={{ fontWeight: "bold", color: "blue" }}>
              {this.state.tempi.length} passaggi
            </span>
            <br />
            {highlight ? (
              <div style={{ color: "olive" }}>
                <div>
                  Trovato <strong>pettorale {highlight}</strong> con{" "}
                  <strong>{highlighted.length} giri</strong>
                </div>
                <div className="pure-g">{highlighted}</div>
              </div>
            ) : (
              <div />
            )}
          </p>
        </div>

        <div className="float-container">
          {categories
            .filter(cat => shouldShowCategoryRanking(this.state, cat))
            .map(cat => (
              <Column
                key={cat}
                category={cat}
                onCategoryAddBib={bib =>
                  this.setState(categoryAddBib(cat, bib))
                }
                onChangeBib={(lapNum0, index, bib) =>
                  this.setState(categoryChangeBib(cat, lapNum0, index, bib))
                }
                bibs={[].concat(this.state.bibs[cat], chronoByCat[cat])}
                lastInsertedBib={this.state.lastBib}
                showCategoryRankingFromLapNum={
                  this.state.showCategoryRankingFromLapNum || Infinity
                }
              />
            ))}
        </div>

        {this.state.showConfig && (
          <div className="categories-input pure-g">
            <div className="pure-u-1-3">
              <h3>Crea categorie</h3>
              (una per riga; altre colonne indicano la griglia; un concorrente
              può essere presente in una sola categoria; inserire la categoria
              ASSOLUTA, senza concorrenti, per generare anche la classifica
              assoluta)
              <br />
              <textarea
                className="categories-input"
                defaultValue={Object.keys(this.state.bibs)
                  .map(cat => [cat, ...this.state.bibs[cat]].join("\t"))
                  .join("\n")}
                ref={el => (this._catsList = el)}
              />
              <button type="submit" onClick={this.handleSetCategories}>
                Aggiorna categorie
              </button>
              <button type="reset" onClick={this.handleClearCategories}>
                Elimina tutte le categorie
              </button>
            </div>

            <div className="pure-u-1-3">
              <h3>Genera griglia categorie</h3>
              (incolla le celle di un file Excel: un concorrente per riga, nella
              prima colonna il pettorale, nella seconda la categoria; la prima
              riga viene saltata se non inizia con un pettorale; se vuoi
              sostituire le categorie attualmente presenti, utilizza prima il
              pulsante Elimina)
              <br />
              <textarea
                className="categories-input"
                defaultValue=""
                ref={el => (this._catsListConc = el)}
              />
              <button type="submit" onClick={this.handleSetCategoriesFromList}>
                Genera categorie
              </button>
            </div>

            <div className="pure-u-1-3">
              <h3>Gestione gara</h3>
              <p>Contagiri versione: 2018-04-16</p>
              <strong>Scarica:</strong>
              <br />
              <button type="submit" onClick={this.handleBackupDownload}>
                Download backup (JSON)
              </button>
              <br />
              <button
                type="submit"
                onClick={this.handleClassifyDownload}
                style={{ color: "blue" }}
              >
                Download CSV-;
              </button>
              <br />
              <br />
              <strong>Carica backup (JSON):</strong>
              <br />
              <input type="file" onChange={this.handleBackupUpload} />
              <br />
              <br />
              <br />
              <br />
              <strong>Area pericolosa:</strong> <br />
              <button
                type="reset"
                onClick={e => {
                  this.handleBackupDownload(e);
                  resetAll();
                }}
              >
                Cancella dati
              </button>
              <br />
              <button
                type="reset"
                onClick={e => {
                  this.handleBackupDownload(e);
                  doubleConfirm(() => this.setState(resetCrono));
                }}
              >
                Cancella cronologico e tempi
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default App;
