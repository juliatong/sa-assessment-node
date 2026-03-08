const books = [
  {
    id: 1,
    title: 'The Art of Doing Science and Engineering',
    author: 'Richard Hamming',
    price: 2300,
    image: '/images/art-science-eng.jpg',
    description: 'The Art of Doing Science and Engineering is a reminder that a childlike capacity for learning and creativity are accessible to everyone.'
  },
  {
    id: 2,
    title: 'The Making of Prince of Persia: Journals 1985-1993',
    author: 'Jordan Mechner',
    price: 2500,
    image: '/images/prince-of-persia.jpg',
    description: 'In The Making of Prince of Persia, on the 30th anniversary of the game\'s release, Mechner looks back at the journals he kept from 1985 to 1993.'
  },
  {
    id: 3,
    title: 'Working in Public: The Making and Maintenance of Open Source',
    author: 'Nadia Eghbal',
    price: 2800,
    image: '/images/working-in-public.jpg',
    description: 'Nadia Eghbal takes an inside look at modern open source and offers a model through which to understand the challenges faced by online creators.'
  }
];

function getBookById(id) {
  return books.find(b => b.id === id) || null;
}

module.exports = { books, getBookById };
