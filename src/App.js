import React, { Component } from 'react';
import merge from 'lodash/merge';

import './App.css';

import Column from './components/Column';

const INITIAL_STATE = {
  bibs: {
    sg1: []
  }
};

const savedStateStr = window.localStorage.getItem('state') || '{}';
const savedState = JSON.parse(savedStateStr);

const findBibCategory = (bibs, bib) => {
  return 'sg1';
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
    this.setState(addBib(category, bib));
  }

  render() {
    return (
      <div className="App">
        <div className="App-header">
          <h2>
            Numero:{' '}
            <input type="number" defaultValue="" onKeyDown={this.handleAddBib} />
          </h2>
        </div>
        
        <Column
          category="sg1"
          onAddBib={bib => this.setState(addBib('sg1', bib))}
          onChangeBib={(index, bib) => this.setState(changeBib('sg1', index, bib))}
          bibs={this.state.bibs['sg1']}
        />

      </div>
    );
  }
}

export default App;
