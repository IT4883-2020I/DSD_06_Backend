const express = require('express');

const Collection = require('../models/payload').Payload;

module.exports = () => {

  // ======
  // Create
  // ======
  const create = (req, res, next) => {
    const newEntry = req.body;
    newEntry.status = 'idle';
    newEntry.histories = [];
    newEntry.config = {
        panning: 0,
        tilting: 0,
        zoom: 1,
        autoTracking: true,
        shotInterval: null
    };
    Collection.create(newEntry, (e,newEntry) => {
      if(e) {
        next(e)
      } else {
        res.send(newEntry);
      }
    });
  };
  
  // =========
  // Read many
  // =========
  const readMany = (req, res, next) => {
    let query = req.query || {};
    Collection.find(query).populate('type').exec((e,result) => {
      if(e) {
        next(e)
      } else {
        res.send(result.filter((item) => item.type != null));
      }
    });
  };

  // ========
  // Read one
  // ========
  const readOne = (req, res, next) => {
    const { _id } = req.params;
  
    Collection.findById(_id).populate('type').exec((e,result) => {
      if(e) {
        next(e)
      } else {
        if (!result || !result.type) {
          next(new Error("Not found payload!"));
          return;
        }
        res.send(result);
      }
    });
  };
  
  // ======
  // Update
  // ======
  const update = (req, res, next) => {
    const changedEntry = req.body;
    delete changedEntry.status;
    delete changedEntry.histories;
    delete changedEntry.config;
    Collection.update({ _id: req.params._id }, { $set: changedEntry }, (e, raw) => {
      console.log(raw)
      if (e)
        next(e)
      else
        res.sendStatus(200);
    });
  };
  
  // ======
  // Remove
  // ======
  const remove = (req, res, next) => {
    Collection.remove({ _id: req.params._id }, (e) => {
      if (e)
        next(e)
      else
        res.sendStatus(200);
    });
  };

  // ======
  // Routes
  // ======

  const histories = (req, res, next) => {
    const { _id } = req.params;
  
    Collection.findById(_id, (e,result) => {
      if(e) {
        next(e)
      } else {
        res.send(result.histories);
      }
    });
  }

  let router = express.Router();

  router.post('/', create);
  router.get('/', readMany);
  router.get('/:_id', readOne);
  router.put('/:_id', update);
  router.delete('/:_id', remove);

  return router;
}