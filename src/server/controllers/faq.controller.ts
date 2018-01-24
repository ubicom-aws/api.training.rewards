import Faq from '../models/faq.model';


function list(req, res, next) {

  const {category, parent_category } = req.query;

  Faq.list(category, parent_category)
    .then(faqs => res.json({
      total: faqs.length,
      results: faqs
    }))
    .catch(e => next(e));
}

function create(req, res) {
  const {title, html, category, parent_category} = req.body;

  const faq = new Faq({
    title: title,
    hash: title.toLowerCase().replace(/ /g,'-').replace(/[^\w-]+/g,''),
    html: html,
    category: category,
    parent_category: parent_category
  });
  faq.save().then(() => {
    res.json({
      title: title,
      hash: title.toLowerCase().replace(/ /g,'-').replace(/[^\w-]+/g,''),
      html: html,
      category: category,
      parent_category: parent_category
    });
  }).catch((err) => res.status(500).json({error_message: err}));

}

export default {create, list};
