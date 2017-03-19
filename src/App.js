import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';
import merge from 'lodash/merge';
import chunk from 'lodash/chunk';
import zip from 'lodash/zip';
import groupBy from 'lodash/groupBy';

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
    alert('#' + bib + ': CATEGORIA MANCANTE (ignorato)');
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

const chronoTable = bibsList => {
  const bibsStr = bibsList.map(b => {
    if (b >= 100) { return '' + b; }
    if (b >= 10) { return ' ' + b; }
    return '  ' + b;
  })
  const matRC = chunk(bibsStr, 10);
  const matCR = zip(...matRC);
  return matCR;
}


class App extends Component {
  constructor(props) {
    super(props);
    this.state = merge(INITIAL_STATE, savedState);
    this.handleCategoryAddBib = this.handleCategoryAddBib.bind(this);
    this.persistState = this.persistState.bind(this);
    this.handleSetCategories = this.handleSetCategories.bind(this);
    this.handleBibEvent = this.handleBibEvent.bind(this);
  }

  componentDidMount() {
    this._persistInterval = setInterval(this.persistState, 500);
  }

  componentWillUnpunt() {
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
    this.setState(addBib(bib))
  }

  handleSetCategories(e) {
    e.preventDefault();
    if (!confirm("Confermi di voler impostare le categorie?")) {
      return;
    }
    const currentCats = Object.keys(this.state.bibs);
    const requestedCats = findDOMNode(this._catsList).value.split('\n').map(c => c.trim());
    requestedCats.forEach(cat => {
      if (currentCats.indexOf(cat) === -1) {
        this.setState(state => ({
          bibs: {
            ...state.bibs,
            [cat]: []
          }
        }));
      }
    })
  }

  render() {
    const categories = Object.keys(this.state.bibs);
    const chrono = chronoTable(this.state.chrono);
    const chronoByCat = groupBy(this.state.chrono, bib => findBibCategory(this.state.bibs, bib));
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

        <div className="categories-input">
          <h2>Configurazione</h2>
          <p>
            Categorie (una per riga):{' '}
            <textarea
              defaultValue={Object.keys(this.state.bibs).join('\n')}
              ref={el => this._catsList = el}
            />
            <button type="submit" onClick={this.handleSetCategories}>
              Aggiorna categorie
            </button>
          </p>
        </div>

        <button type="reset" onClick={resetAll}>Cancella dati</button>
      </div>
    );
  }
}

export default App;
