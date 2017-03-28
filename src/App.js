import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';
import merge from 'lodash/merge';
import chunk from 'lodash/chunk';
import zip from 'lodash/zip';
import groupBy from 'lodash/groupBy';
import memoize from 'fast-memoize';

// import './pure-min.css'; // breaks textareas and cell margins
import './App.css';

import Column from './components/Column';

const INITIAL_STATE = {
  bibs: {},
  chrono: []
};

const savedStateStr = window.localStorage.getItem('state') || '{}';
const savedState = JSON.parse(savedStateStr);

const resetAll = () => {
  if (confirm('Vuoi veramente eliminare tutti i dati?')) {
    if (confirm('Sei sicuro di voler fare un reset completo?')) {
      window.localStorage.clear();
      window.location.reload();
    }
  }
};

const findBibCategory = (bibs, bib) => {
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
    console.log('#' + bib + ': CATEGORIA MANCANTE (ignorato)');
  }
  return found;
}

const categoryAddBib = (category, bib) => (state) =>
  merge(state, {
    bibs: {
      [category]: [].concat(state.bibs[category] || [], bib)
    }
  });

const changeBib = (category, lapNum0, index, nextValue) => state => {
  const oldBibs = state.bibs[category];
  const nextBibs = [
    ...oldBibs.slice(0, index),
    nextValue,
    ...oldBibs.slice(index + 1)
  ];
  return merge(state, {
    bibs: {
      [category]: nextBibs
    }
  });
}

const addBib = bib => state => {
  return {
    chrono: [].concat(state.chrono, bib)
  };
}

const chronoTable = memoize(bibsList => {
  const bibsStr = bibsList.map(b => {
    if (b >= 100) { return '' + b; }
    if (b >= 10) { return ' ' + b; }
    return '  ' + b;
  })
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
    this.handleSetCategoriesFromList = this.handleSetCategoriesFromList.bind(this);
    this.handleBibEvent = this.handleBibEvent.bind(this);
    this.handleBackupDownload = this.handleBackupDownload.bind(this);
    this.handleBackupUpload = this.handleBackupUpload.bind(this);
  }

  componentDidMount() {
    this._persistInterval = setInterval(this.persistState, 500);
  }

  componentWillUnmount() {
    this.clearInterval(this._persistInterval);
  }

  persistState() {
    window.localStorage.setItem('state', JSON.stringify(this.state));
  }

  handleCategoryAddBib(e) {
    if (e.nativeEvent.keyCode !== 13) {
      return;
    }
    const bib = Number(e.target.value);
    e.target.value = '';
    const category = findBibCategory(this.state.bibs, bib);
    if (category === false) {
      return;
    }
    this.setState(categoryAddBib(category, bib));
  }

  handleBibEvent(e) {
    if (e.nativeEvent.keyCode !== 13) {
      return;
    }
    const bib = Number(e.target.value);
    e.target.value = '';
    if (!findBibCategory(this.state.bibs, bib)) {
      alert('Non esiste: ' + bib);
      return;
    }
    this.setState(addBib(bib))
  }

  handleSetCategories(e) {
    e.preventDefault();
    if (!confirm("Confermi di voler impostare le categorie?")) {
      return;
    }
    const currentCats = Object.keys(this.state.bibs);
    const requestedCats = findDOMNode(this._catsList).value.split('\n').map(c => c.trim().split('\t'));
    requestedCats.forEach(([cat, ...bibs]) => {
      if (currentCats.indexOf(cat) === -1) {
        this.setState(state => ({
          bibs: {
            ...state.bibs,
            [cat]: [...bibs].map(b => Number(b))
          }
        }));
      }
    })
  }

  handleSetCategoriesFromList(e) {
    e.preventDefault();
    const acc = {};
    const requestedCats = findDOMNode(this._catsListConc).value.split('\n').map(c => c.trim().split('\t'));
    requestedCats.forEach(([pett, cat]) => {
      if (isNaN(pett)) { // cast to Number
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
    findDOMNode(this._catsList).value = Object.keys(acc).map(catName => {
      return [
        catName,
        ...acc[catName]
      ].join('\t');
    }).join('\n');
    this.handleSetCategories(e);
  }

  handleBackupDownload(e) {
    e.preventDefault();
    const a = document.createElement('a');
    const blob = new Blob([JSON.stringify(this.state)], {'type':'application/json'});
    a.href = window.URL.createObjectURL(blob);
    a.download = 'backup-' + Date.now() + '.json';
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

  render() {
    const categories = getCategories(this.state.bibs);
    const chrono = chronoTable(this.state.chrono.filter(bib => bib !== 0));
    const chronoByCat = getChronoByCat(this.state.chrono, this.state.bibs);
    return (
      <div className="App">
        <div className="App-header">
          <h2>
            Numero:{' '}
            <input type="number" defaultValue="" onKeyDown={this.handleBibEvent} /><br />
          </h2>
        </div>

        <div className="header-spacer"></div>

        <div className="chrono">
          <textarea value={chrono.map(r => r.join('  ')).join('\n')} readOnly></textarea>
        </div>

        <div className="float-container">
          {categories.map(cat =>
            <Column
              key={cat}
              category={cat}
              onCategoryAddBib={bib => this.setState(categoryAddBib(cat, bib))}
              onChangeBib={(lapNum0, index, bib) => this.setState(changeBib(cat, lapNum0, index, bib))}
              bibs={[].concat(this.state.bibs[cat], chronoByCat[cat])}
            />
          )}
        </div>

        <h2>Configurazione</h2>
        <p>
          Prima di iniziare la gara, crea oppure importa le categorie da Excel seguendo
          le istruzioni qui sotto.
        </p>

        <div className="categories-input pure-g">
          
          <div className="pure-u-1-3">
            <h3>Crea categorie</h3>
            (una per riga; altre colonne indicano la griglia)
            <br />
            <textarea
              className="categories-input"
              defaultValue={Object.keys(this.state.bibs).join('\n')}
              ref={el => this._catsList = el}
            />
            <button type="submit" onClick={this.handleSetCategories}>
              Aggiorna categorie
            </button>
          </div>
          
          <div className="pure-u-1-3">
            <h3>Importa categorie</h3>
            <br />
            (incolla un Excel: un concorrente per riga, nella prima colonna il pettorale, nella seconda la categoria; la prima riga viene saltata se non inizia con un pettorale)
            <br />
            <textarea
              className="categories-input"
              defaultValue=""
              ref={el => this._catsListConc = el}
            />
            <button type="submit" onClick={this.handleSetCategoriesFromList}>
              Importa categorie
            </button>
          </div>


          <div className="pure-u-1-3">
            <h3>Gestione gara</h3>

            <strong>Scarica backup:</strong>{' '}
            <button type="submit" onClick={this.handleBackupDownload}>
              Download
            </button>
            <br />
            <br />

            <strong>Carica backup:</strong>{' '}
            <input type="file" onChange={this.handleBackupUpload} />
            <br />
            <br />

            <strong>Area pericolosa:</strong>{' '}
            <button type="reset" onClick={resetAll}>Cancella dati</button>
          </div>

        </div>
      </div>
    );
  }
}

export default App;
