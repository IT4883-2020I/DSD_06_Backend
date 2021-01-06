const express = require('express');

const Logging = require('../models/payload').PayloadLogging;

module.exports = () => {
    // ======
    // Routes
    // ======

    const statFeeFixing = (req, res, next) => {
        const {from, to, payload} = req.query
        let predict = {type: 'fixing'}
        if (from && to) {
            predict.startedAt = { $gte: from, $lte: to }
        } else if (from) {
            predict.startedAt = { $gte: from }
        } else if (to) {
            predict.startedAt = { $lte: to }
        }

        if (payload) {
            predict.payload = payload
        }

        Logging.find(predict).populate('payload', { _id: 1, code: 1, name: 1})
        .exec((e, result) => {
            if (e) {
                next(e)
            } else {
                res.send(result.filter((item) => { return item.payload != null }))
            }
        })
    }

    const statFeeWorking = (req, res, next) => {
        const {from, to, payload} = req.query
        let predict = { type: 'working' }
        if (from && to) {
            predict.startedAt = { $gte: from, $lte: to }
        } else if (from) {
            predict.startedAt = { $gte: from }
        } else if (to) {
            predict.startedAt = { $lte: to }
        }

        if (payload) {
            predict.payload = payload
        }

        Logging.find(predict).populate('payload', { _id: 1, code: 1, name: 1})
        .exec((e, result) => {
            if (e) {
                next(e)
            } else {
                res.send(result.filter((item) => { return item.payload != null }))
            }
        })
    }

    let router = express.Router();

    router.get('/feeFixing', statFeeFixing);
    router.get('/feeWorking', statFeeWorking);

    return router;

}