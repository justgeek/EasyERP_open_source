﻿define([
        'models/hiredFired'
    ],
    function (Model) {
        var Colection = Backbone.Collection.extend({
            model: Model,

            initialize: function () {

            },
            /*comparator: 'name'*/

        });

        return Colection;
    });