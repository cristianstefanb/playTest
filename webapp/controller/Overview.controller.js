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

		onSelectModel: function (oEvent) {
			var key = oEvent.getSource().getSelectedKey();
			var oPromiseDBDelete = IndexedDB.deleteDB();

			oPromiseDBDelete.then(function () {
				this._sync(this, key);
			}.bind(this)).
			catch(function (err) {
				alert(err);
			});

		},

		_sync: function (ctrl, sModel) {
			var that = this;
			sap.ui.core.BusyIndicator.show(0);

			var oPromise = Utils.generateXMLDocument(ctrl, sModel);

			$.when(oPromise).then(function (xmlDoc) {
				var arrMappings = Utils.parseXmlDoc(xmlDoc);
				var aDataForDB = [];

				function fnBindComboBox(aOS) {
					var arr = [];
					for (var i = 0; i < aOS.length; i++) {
						arr.push({
							key: aOS[i]
						});
					}
					that.getOwnerComponent().getModel("comboboxModel").setData(arr);
				}

				function fnServerData() {
					var aDef = [];

					arrMappings.mapping.forEach(function (entity, index) {
						aDef[index] = new $.Deferred();
						var sOS = entity.entitySet;
						var oNewPromise = Utils._readServerData(that, sOS, sModel);
						$.when(oNewPromise).then(function (data) {
							aDataForDB[index] = {
								entity: entity,
								results: data
							};
							aDef[index].resolve();

						});
						return aDef[index].promise();
					}.bind(that));

					aDef.push(pushMappingsToIDB(arrMappings));

					$.when.apply($, aDef).done(function () {

						var newPromise = IndexedDB.syncAll(aDataForDB);
						$.when(newPromise).then(function () {
							sap.ui.core.BusyIndicator.hide();
						}).catch(function (err) {
							sap.ui.core.BusyIndicator.hide();
						});
					});

				}

				function pushMappingsToIDB(arr) {
					var dfd = new $.Deferred();
					var newPromise = IndexedDB.putData(arr.map, "mappings");

					newPromise.then(function () {
						dfd.resolve();
					});
					return dfd.promise();
				}

				var dbUpgradeNeeded = IndexedDB._upgrade(arrMappings);

				dbUpgradeNeeded.then(function (result) {
					var aOS = result.objectStoreNames;

					fnBindComboBox(aOS);
					fnServerData();
				}.bind(this));
			}.bind(this));

		},

		onSelect: function (event) {
			sap.ui.core.BusyIndicator.show(0);
			var sEntity = event.getParameter("newValue");
			var oTable = this.getView().byId("idMyTable");
			oTable.destroyColumns();

			var oMappings = IndexedDB.getAllDataForSet("mappings");
			oMappings.then(function (mappings) {
				var oPromiseData = IndexedDB.getAllDataForSet(sEntity);
				oPromiseData.then(function (result) {
					var oCell = [];
					var aProperties = mappings.find(function (mappingToEntity) {
						return mappingToEntity.key === sEntity;
					});

					for (var prop in aProperties) {
						if (prop !== "key") {
							var oColumn = new sap.m.Column({
								width: "1em",
								header: new sap.m.Label({
									text: prop
								})
							});
							var cell = this._transformCell(sEntity, mappings, prop);

							oCell.push(cell);
							oTable.addColumn(oColumn);
						}

					}

					var aColList = new sap.m.ColumnListItem({
						cells: oCell
					});
					oTable.bindItems("model>/", aColList);
					this.getOwnerComponent().getModel("model").setData(result);
					sap.ui.core.BusyIndicator.hide();
				}.bind(this));
			}.bind(this));

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
						if( aOS[i] !== "mappings" ) {
							arr.push({
								key: aOS[i]
							});	
						}
						
					}
					dfd.resolve(arr);
				} else {
					dfd.reject();
				}

			}).catch(function (err) {
				dfd.reject();
			});
			return dfd.promise();
		},

		_transformCell: function (entity, arr, prop) {
			var result = arr.find(function (item) {
				return item.key === entity;
			});
			var type;
			var cell;

			for (var pP in result) {
				if (pP === prop) {
					type = result[pP];
				}
			}

			var sProp = "model>" + prop;

			if (Array.isArray(type)) {
				cell = new sap.m.VBox();
				for (var i in type) {
					cell.addItem(new sap.m.Text({
						text: "{" + sProp + "/" + i + "}"
					}));
				}

			} else {

				switch (type) {
				case "Edm.Binary":
					cell = new sap.m.Image();
					cell.bindProperty("src", sProp, function (sVal) {
						if (typeof sVal === "string") {
							var sTrimmed = sVal.substr(104);
							return "data:image/bmp;base64," + sTrimmed;
						}
						return sVal;
					});
					break;
				case "Edm.DateTime":
					cell = new sap.m.DatePicker({
						enabled: false
					}).bindProperty("value", sProp, function (sVal) {
						if (sVal) {
							var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
								pattern: "dd.MM.yyyy"
							});
							return oDateFormat.format(new Date(sVal));
						} else {
							return sVal;
						}
					});
					break;
				default:
					cell = new sap.m.Text({
						text: "{model>" + prop + "}"
					});
					break;
				}
			}

			return cell;
		}
	});

});