import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';
import merge from 'lodash/merge';

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

const addBib = (category, bib) => (state) => 
  merge(state, {
    bibs: {
      [category]: [].concat(state.bibs[category] || [], bib)
    }
  });

const changeBib = (category, index, nextValue) => state => {
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


class App extends Component {
  constructor(props) {
    super(props);
    this.state = merge(INITIAL_STATE, savedState);
    this.handleAddBib = this.handleAddBib.bind(this);
    this.persistState = this.persistState.bind(this);
    this.handleSetCategories = this.handleSetCategories.bind(this);
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

  handleAddBib(e) {
    if (e.nativeEvent.keyCode !== 13) {
      return;
    }
    const bib = Number(e.target.value);
    e.target.value = '';
    const category = findBibCategory(this.state.bibs, bib);
    if (category === false) {
      return;
    }
    this.setState(addBib(category, bib));
    this.setState(state => ({ chrono: [].concat(state.chrono, [bib]) }));
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
    return (
      <div className="App">
        <div className="App-header">
          <h2>
            Numero:{' '}
            <input type="number" defaultValue="" onKeyDown={this.handleAddBib} />
          </h2>
        </div>
        
        <div className="float-container">
          {categories.map(cat => 
            <Column
              key={cat}
              category={cat}
              onAddBib={bib => this.setState(addBib(cat, bib))}
              onChangeBib={(index, bib) => this.setState(changeBib(cat, index, bib))}
              bibs={this.state.bibs[cat]}
            />
          )}
        </div>

        <div className="chrono">
          <h2>Cronologico</h2>
          <textarea value={this.state.chrono.join('  ')} readOnly></textarea>
          <small>(leggere in orizzontale, per righe)</small>
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
