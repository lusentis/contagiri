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
  };
};

const addBib = bib => state => {
  if (bib === 0 || Number(bib) === 0) {
    return;
  }
  return {
    chrono: [].concat(state.chrono, bib),
    tempi: [].concat(state.tempi, Date.now()),
  };
};

const removeLastBib = bib => state => {
  if (!bib) {
    bib = 9999;
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

const fixupLastBib = bib => state => {
  if (!bib) {
    bib = 9999;
  }
  if (state.chrono.lastIndexOf(bib) === -1) {
    alert("Non posso correggere l'ultimo giro perché non esiste: " + bib);
    return;
  }
  const next = Number(prompt("Sostituire con?"));
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
  return {
    ...state,
    highlight,
  };
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
    this.scrollChrono();
  }

  componentWillUnmount() {
    this.clearInterval(this._persistInterval);
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

    if (!bib) {
      bib = 9999;
    }

    // if (!findBibCategory(this.state.bibs, bib)) {
    // maybe display category somewhere
    // }
    this.setState(addBib(bib));
  }

  handleSetCategories(e) {
    e.preventDefault();
    if (!confirm("Confermi di voler impostare le categorie?")) {
      return;
    }
    const currentCats = Object.keys(this.state.bibs);
    const requestedCats = findDOMNode(this._catsList)
      .value.split("\n")
      .map(c => c.trim().split(/\t|\s{2,}/));
    requestedCats.forEach(([cat, ...bibs]) => {
      if (!cat) {
        return;
      }
      if (currentCats.indexOf(cat) === -1) {
        this.setState(state => ({
          bibs: {
            ...state.bibs,
            [cat]: [...bibs].map(b => Number(b)),
          },
        }));
      }
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
    e.preventDefault();
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
    return (
      <div className="App">
        <div className="App-header">
          <h2>
            Numero:{" "}
            <input
              type="number"
              defaultValue=""
              onKeyDown={e => {
                this.handleBibEvent(e);
                this.scrollChrono();
              }}
            />
            <br />
            <small>
              ↵ aggiunge, - rimuove u.g., * corregge u.g., "s" sposta su, "?"
              trova, "x" scambia ultimi due arrivi
            </small>
          </h2>
        </div>

        <div className="header-spacer" />

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
                            onClick={e => this.setState(insertBibTime(cell[2]))}
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

        <div>
          <p>
            <span style={{ fontWeight: "bold", color: "blue" }}>
              {this.state.tempi.length} passaggi
            </span>
            <br />
            {highlight ? (
              <span style={{ fontWeight: "bold", color: "orange" }}>
                {highlight} in posizione:{" "}
                {this.state.chrono
                  .map(
                    (b, i) =>
                      b === highlight
                        ? `${i + 1}° (${formatTempo(this.state.tempi[i])})`
                        : false
                  )
                  .filter(Boolean)
                  .join(", ")}
              </span>
            ) : (
              <span />
            )}
          </p>
        </div>

        <div className="float-container">
          {categories.map(cat => (
            <Column
              key={cat}
              category={cat}
              onCategoryAddBib={bib => this.setState(categoryAddBib(cat, bib))}
              onChangeBib={(lapNum0, index, bib) =>
                this.setState(categoryChangeBib(cat, lapNum0, index, bib))
              }
              bibs={[].concat(this.state.bibs[cat], chronoByCat[cat])}
            />
          ))}
        </div>

        <h2>Configurazione</h2>
        <p>
          Prima di iniziare la gara, crea oppure importa le categorie da Excel
          seguendo le istruzioni qui sotto.
        </p>

        <div className="categories-input pure-g">
          <div className="pure-u-1-3">
            <h3>Crea categorie</h3>
            (una per riga; altre colonne indicano la griglia)
            <br />
            <textarea
              className="categories-input"
              defaultValue={Object.keys(this.state.bibs).join("\n")}
              ref={el => (this._catsList = el)}
            />
            <button type="submit" onClick={this.handleSetCategories}>
              Aggiorna categorie
            </button>
          </div>

          <div className="pure-u-1-3">
            <h3>Importa categorie</h3>
            (incolla un Excel: un concorrente per riga, nella prima colonna il
            pettorale, nella seconda la categoria; la prima riga viene saltata
            se non inizia con un pettorale)
            <br />
            <textarea
              className="categories-input"
              defaultValue=""
              ref={el => (this._catsListConc = el)}
            />
            <button type="submit" onClick={this.handleSetCategoriesFromList}>
              Importa categorie
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
      </div>
    );
  }
}

export default App;
