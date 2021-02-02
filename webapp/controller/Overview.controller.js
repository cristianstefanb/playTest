sap.ui.define([
	"./BaseController",
	"../model/indexedDB",
	"../model/utils",
	"sap/m/MessageBox"
], function (BaseController, IndexedDB, Utils, MessageBox) {
	"use strict";

	return BaseController.extend("de.sdc.indexeddb_prototype.controller.Overview", {

		onInit: function () {
			if (!IndexedDB.checkAvailability()) return;
			var aPromiseComboboxItems = this._getComboboxItems();
			$.when(aPromiseComboboxItems).then(function (arr) {
				this.getOwnerComponent().getModel("comboboxModel").setData(arr);
			}.bind(this));
		},

		

		onSync: function (event) {
			sap.ui.core.BusyIndicator.show(0);

			var oPromise = Utils.generateXMLDocument(event);

			$.when(oPromise).then(function (xmlDoc) {
				var arrMappings = Utils.parseXmlDoc(xmlDoc);
				var dbUpgradeNeeded = IndexedDB._upgrade(arrMappings);
				dbUpgradeNeeded.then(function (result) {
					debugger
					var aOS = result.objectStoreNames;
					var arr = [];
					for (var i = 0; i < aOS.length; i++) {
						arr.push({
							key: aOS[i]
						});
					}
					this.getOwnerComponent().getModel("comboboxModel").setData(arr);

					var aDef = [];
					arrMappings.mapping.forEach(function (entity, index) {
						aDef[index] = new $.Deferred();
						var sOS = entity.entitySet;
						var oNewPromise = Utils._readServerData(this, sOS);
						$.when(oNewPromise).then(function (data) {
							aDef[index].resolve();
						}.bind(this));
						return aDef[index].promise();
					}.bind(this));
					debugger
					$.when(aDef).then(function () {
						debugger
						sap.ui.core.BusyIndicator.hide();
					});

				}.bind(this));
			}.bind(this));

		},
		
		onSelect: function (event) {
			debugger;
			var sEntity = event.getParameter("newValue");
			var oTable = this.getView().byId("idMyTable");
			oTable.destroyColumns();
			
			var oPromiseData = IndexedDB.getAllDataForSet(sEntity);
			oPromiseData.then(function (result) {
				var i = 0;
				var oCell = [];
				for (var prop in result[0]) {
					if (prop !== "__metadata") {

						var oColumn = new sap.m.Column("col" + i, {
							width: "1em",
							header: new sap.m.Label({
								text: prop
							})
						});
						oTable.addColumn(oColumn);
						var cell1 = new sap.m.Text({
							text: "{model>" + prop + "}"
						});
						oCell.push(cell1);
						i++;
					}

				}
				var aColList = new sap.m.ColumnListItem({
					cells: oCell
				});
				oTable.bindItems("model>/", aColList);
				this.getOwnerComponent().getModel("model").setData(result);
			}.bind(this));
			// });

		},

		/**
		 * Function which returns an array of objects to bind items of Combobox
		 * @public
		 * @returns {array} array for 
		 */
		_getComboboxItems: function () {
			var dfd = new $.Deferred();
			var oDataPromise = IndexedDB.init();

			oDataPromise.then(function (result) {
				var db = result;
				var aOS = db.objectStoreNames;
				var arr = [];
				if (aOS.length > 0) {
					for (var i = 0; i < aOS.length; i++) {
						arr.push({
							key: aOS[i]
						});
					}
					dfd.resolve(arr);
				} else {
					db._upgradeDBNeeded = true;
					dfd.reject(MessageBox.warning(
						"No ObjectStore defined in IndexedDB. We recommend to synchronize the app.", {
							icon: MessageBox.Icon.WARNING,
							title: "Warning",
							actions: [MessageBox.Action.CLOSE],
							emphasizedAction: MessageBox.Action.CLOSE
						}
					));
				}

				db.close();
			}).catch(function (err) {
				dfd.reject();
			});
			return dfd.promise();
		},

	});

});