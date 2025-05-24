// scrape/trelloScraper.js
const axios = require('axios');

async function getTrelloStats() {
  const url = 'https://trello.com/b/9f4FWdJp/aistraix-chess-association.json';
  const { data } = await axios.get(url);

  // Sólo listas abiertas
  const openLists = data.lists.filter(list => list.closed === false);
  const cards = data.cards; // no hace falta filtrar tarjetas, ya que las de listas cerradas no las contaremos

  return openLists.map(list => ({
    list: list.name,
    cards: cards.filter(c => c.idList === list.id).length
  }));
}

module.exports = { getTrelloStats };
