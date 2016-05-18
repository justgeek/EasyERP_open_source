define([
    'text!templates/Projects/projectInfo/quotations/quotationTemplate.html',
    'text!templates/Projects/projectInfo/quotations/ListTemplate.html',
    'text!templates/stages.html',
    'views/salesQuotation/EditView',
    'views/salesQuotation/list/ListView',
    'views/Projects/projectInfo/quotations/CreateView',
    'collections/Quotation/filterCollection',
    'models/QuotationModel',
    'common',
    'helpers',
    'dataService'

], function (quotationTopBar, ListTemplate, stagesTemplate, editView, listView, quotationCreateView, quotationCollection, currentModel, common, helpers, dataService) {
    var quotationView = listView.extend({

        el                      : '#quotations',
        totalCollectionLengthUrl: '/quotation/totalCollectionLength',
        contentCollection       : quotationCollection,
        templateHeader          : _.template(quotationTopBar),
        templateList            : _.template(ListTemplate),

        events: {
            "click .checkbox"                    : "checked",
            "click #createQuotation"             : "createQuotation",
            "click #removeQuotation"             : "removeItems",
            "click  .list tbody td:not(.notForm)": "goToEditDialog",
            "click .stageSelect"                 : "showNewSelect"
        },

        initialize: function (options) {
            this.remove();
            this.visible = options.visible;
            this.projectModel = options.model;
            this.wTrackCollection = options.wTrackCollection;
            this.createJob = options.createJob;
            this.collection = options.collection;
            this.projectID = options.projectId;
            this.customerId = options.customerId;
            this.salesManager = options.salesManager;
            this.filter = options.filter ? options.filter : {};
            this.defaultItemsNumber = 50;
            this.page = options.page ? options.page : 1;
            this.eventChannel = options.eventChannel;
        },

        chooseOption: function (e) {
            var self = this;
            var target$ = $(e.target);
            var targetElement = target$.closest("tr");
            var parentTd = target$.closest("td");
            var a = parentTd.find("a");
            var id = targetElement.attr("data-id");
            var model = this.collection.get(id);

            model.save({
                workflow: {
                    _id : target$.attr("id"),
                    name: target$.text()
                }
            }, {
                headers : {
                    mid: 55
                },
                patch   : true,
                validate: false,
                success : function () {
                    a.text(target$.text())
                }
            });

            this.hideNewSelect();

            return false;
        },

        goSort: function (e) {
            var target$;
            var currentParrentSortClass;
            var sortClass;
            var sortConst;
            var sortBy;
            var sortObject;

            this.collection.unbind('reset');
            this.collection.unbind('showmore');

            target$ = $(e.target).closest('th');
            currentParrentSortClass = target$.attr('class');
            sortClass = currentParrentSortClass.split(' ')[1];
            sortConst = 1;
            sortBy = target$.data('sort');
            sortObject = {};

            if (!sortClass) {
                target$.addClass('sortUp');
                sortClass = "sortUp";
            }
            switch (sortClass) {
                case "sortDn":
                {
                    target$.parent().find("th").removeClass('sortDn').removeClass('sortUp');
                    target$.removeClass('sortDn').addClass('sortUp');
                    sortConst = 1;
                }
                    break;
                case "sortUp":
                {
                    target$.parent().find("th").removeClass('sortDn').removeClass('sortUp');
                    target$.removeClass('sortUp').addClass('sortDn');
                    sortConst = -1;
                }
                    break;
            }
            sortObject[sortBy] = sortConst;

            this.fetchSortCollection(sortObject);
            this.getTotalLength(null, this.defaultItemsNumber, this.filter);
        },

        renderContent: function () {
            var $currentEl = this.$el;
            var pagenation;

            $("#top-bar-deleteBtn").hide();
            $('#check_all').prop('checked', false);

            if (this.collection.length > 0) {
                $currentEl.find('#listTableQuotation').html(this.templateList({
                    quotations      : this.collection.toJSON(),
                    startNumber     : 0,
                    dateToLocal     : common.utcDateToLocaleDate,
                    currencySplitter: helpers.currencySplitter,
                    currencyClass: helpers.currencyClass
                }));
            }

            pagenation = this.$el.find('.pagination');
            if (this.collection.length === 0) {
                pagenation.hide();
            } else {
                pagenation.show();
            }
        },

        getTotalLength: function (currentNumber, itemsNumber, filter) {
            dataService.getData(this.totalCollectionLengthUrl, {
                currentNumber: currentNumber,
                filter       : filter,
                contentType  : this.contentType,
                newCollection: this.newCollection
            }, function (response, context) {

                var page = context.page || 1;
                var length = context.listLength = response.count || 0;

                if (itemsNumber === 'all') {
                    itemsNumber = response.count;
                }

                if (itemsNumber * (page - 1) > length) {
                    context.page = page = Math.ceil(length / itemsNumber);
                    // context.fetchSortCollection(context.sort);
                    // context.changeLocationHash(page, context.defaultItemsNumber, filter);
                }

                context.pageElementRender(response.count, itemsNumber, page);//prototype in main.js
            }, this);
        },

        goToEditDialog: function (e) {
            e.preventDefault();
            var self = this;

            var id = $(e.target).closest("tr").attr("data-id");
            var model = new currentModel({validate: false});
            var modelQuot = this.collection.get(id);

            self.collection.bind('remove', renderProformRevenue);

            function renderProformRevenue() {
                self.renderProformRevenue(modelQuot);
                self.render();
            }

            App.startPreload();

            model.urlRoot = '/quotation/form/' + id;
            model.fetch({
                success: function (model) {
                    new editView({
                        model        : model,
                        redirect     : true,
                        pId          : self.projectID,
                        customerId   : self.customerId,
                        collection   : self.collection,
                        hidePrAndCust: true,
                        eventChannel : self.eventChannel
                    });

                    //self.collection.remove(id);

                },
                error  : function (xhr) {
                    App.render({
                        type   : 'error',
                        message: "Please refresh browser"
                    });
                }
            });
        },

        renderProformRevenue: function (modelQuot) {
            var proformContainer = $('#proformRevenueContainer');
            var modelJSON = modelQuot.toJSON();

            var orderSum = proformContainer.find('#orderSum');
            var orderCount = proformContainer.find('#orderCount');
            var totalSum = proformContainer.find('#totalSum');
            var totalCount = proformContainer.find('#totalCount');
            var total = orderSum.attr('data-value');
            var order = orderSum.attr('data-value');
            var newTotal;
            var newOrder;

            total = parseFloat(total);
            order = parseFloat(order);
            newTotal = total + modelJSON.paymentInfo.total;
            newOrder = order + modelJSON.paymentInfo.total;

            orderSum.attr('data-value', newOrder);
            orderSum.text(helpers.currencySplitter(newOrder.toString()));

            totalSum.attr('data-value', newTotal);
            totalSum.text(helpers.currencySplitter(newTotal.toString()));

            orderCount.text(parseFloat(orderCount.text()) + 1);
            totalCount.text(parseFloat(totalCount.text()) + 1);
        },

        removeItems: function (event) {
            event.preventDefault();

            var answer = confirm("Really DELETE items ?!");

            var that = this;
            var mid = 39;
            var model;
            var localCounter = 0;
            var listTableCheckedInput;
            var count;
            var table = $("#quotationTable");

            listTableCheckedInput = table.find("input:not('#check_all_quotations'):checked");
            count = listTableCheckedInput.length;
            this.collectionLength = this.collection.length;

            if (answer == true) {
                $.each(listTableCheckedInput, function (index, checkbox) {
                    model = that.collection.get(checkbox.value);
                    model.destroy({
                        headers: {
                            mid: mid
                        },
                        wait   : true,
                        success: function (model) {
                            var id = model.get('_id');

                            table.find('[data-id="' + id + '"]').remove();

                            $("#removeQuotation").hide();
                            $('#check_all_quotations').prop('checked', false);

                            that.eventChannel && that.eventChannel.trigger('elemCountChanged');

                            //that.deleteItemsRender(that.deleteCounter, that.deletePage);
                        },
                        error  : function (model, res) {
                            if (res.status === 403 && index === 0) {
                                App.render({
                                    type   : 'error',
                                    message: "You do not have permission to perform this action"
                                });
                            }
                            that.listLength--;
                            count--;
                            if (count === 0) {
                                that.deleteCounter = localCounter;
                                that.deletePage = $("#currentShowPage").val();
                                that.deleteItemsRender(that.deleteCounter, that.deletePage);
                            }
                        }
                    });
                });
            }

        },

        checked: function (e) {
            e.stopPropagation();

            var el = this.$el;
            var $targetEl = $(e.target);
            var checkLength = el.find("input.checkbox:checked").length;
            var checkAll$ = el.find('#check_all_quotations');
            var removeBtnEl = $('#removePayment');

            if ($targetEl.hasClass('notRemovable')) {
                $targetEl.prop('checked', false);

                return false;
            }

            if (this.collection.length > 0) {
                if (checkLength > 0) {
                    checkAll$.prop('checked', false);

                    removeBtnEl.show();

                    if (checkLength == this.collection.length) {

                        checkAll$.prop('checked', true);
                    }
                } else {
                    removeBtnEl.hide();
                    checkAll$.prop('checked', false);
                }
            }
        },

        createQuotation: function (e) {
            e.preventDefault();
            new quotationCreateView({
                projectId       : this.projectID,
                customerId      : this.customerId,
                collection      : this.collection,
                salesManager    : this.salesManager,
                projectModel    : this.projectModel,
                wTrackCollection: this.wTrackCollection,
                createJob       : this.createJob,
                eventChannel    : this.eventChannel
            });
        },

        render: function () {
            var $currentEl = this.$el;
            var self = this;

            $currentEl.html('');
            $currentEl.prepend(this.templateHeader);

            $currentEl.find('#listTableQuotation').html(this.templateList({
                quotations      : this.collection.toJSON(),
                startNumber     : 0,
                dateToLocal     : common.utcDateToLocaleDate,
                currencySplitter: helpers.currencySplitter,
                currencyClass: helpers.currencyClass
            }));

            this.$el.find('#removeQuotation').hide();

            $('#check_all_quotations').click(function () {
                self.$el.find(':checkbox:not(.notRemovable)').prop('checked', this.checked);
                if ($("input.checkbox:checked").length > 0) {
                    $("#removeQuotation").show();
                } else {
                    $("#removeQuotation").hide();
                }
            });

            dataService.getData("/workflow/fetch", {
                wId         : 'Sales Order',
                source      : 'purchase',
                targetSource: 'quotation'
            }, function (stages) {
                self.stages = stages;
            });

            self.eventChannel.trigger('elemCountChanged');
        }

    });

    return quotationView;
});