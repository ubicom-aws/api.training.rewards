import Faq from '../models/faq.model';
import * as httpstatus from 'http-status';


function list(req, res, next) {

  const {category, parent_category } = req.query;

  Faq.list(category, parent_category)
    .then(faqs => res.json({
      total: faqs.length,
      results: faqs
    }))
    .catch(e => next(e));
}

function update(req, res) {
  let {id, title, html, category, parent_category} = req.body;

  if (parent_category === null) parent_category = undefined;

  let newFaq = {
    title: title,
    hash: title.toLowerCase().replace(/ /g,'-').replace(/[^\w-]+/g,''),
    html: html,
    category: category
  };

  if(parent_category) {
    newFaq['parent_category'] = parent_category
  }
  console.log(newFaq)
  Faq.findOneAndUpdate({"_id":id},newFaq,(err, faq) => {
    res.json(faq)
  })
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

export default {create, list, update};
