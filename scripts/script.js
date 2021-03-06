// Ilia Matrosov
// 2016

(function(global){
    "use strict";

    document.addEventListener("DOMContentLoaded", onDomLoad);
    var VALIDATION_ERROR_MESSAGE = "Поле обязательно к заполнению",
        STUDENT_LIST_URL = "studentsList.json",
        NAME_RULE = new RegExp("[^A-Za-zА-Яа-яЁё]", "g");


    var barArray = [],
        radioArray =[],
        studentsArray,
        studentTemplate,
        errorTemplate,
        unsavedStudentsArray = [],
        subjectHtml,
        linechartBarHtml,
        nameListNameHtml,
        currentStudentIndex = 0;


    function onDomLoad(){
        getTemplates();

        $ajaxUtils.sendGetRequest(STUDENT_LIST_URL,
                        function(parsedObject){
                            if (parsedObject.isError) {
                                showLoadingError(parsedObject.cause);
                                return;
                            }
                            studentsArray = parsedObject.students;
                            studentTemplate = parsedObject.template;
                            onDataLoad();

                        });
    }

    function getTemplates(){
        subjectHtml = document.querySelector('#template--subject').innerHTML,
        linechartBarHtml = document.querySelector('#template--linechart-bar').innerHTML,
        nameListNameHtml = document.querySelector('#template--name-list__name').innerHTML,
        errorTemplate = document.querySelector("#template--error").innerHTML;
    }

    function onDataLoad(){
        fillFormFields(currentStudentIndex);
        addListeners();
        initPickmeup();
        showGroupList();
        updateNameListView();
    }

    function addListeners(){

        document.addEventListener("click", onClick);

        document.getElementById("data-container").addEventListener("blur", onListInputBlur,true);
        document.getElementById("data-container").addEventListener("focus", onListInputFocus,true);
        document.getElementById("data-container").addEventListener("change", onDataChange,true);
        document.getElementById("data-container").addEventListener("input", onInputChange,true);
        document.getElementById("subject-list-container").addEventListener("change", onSubjectlistChange);
        document.getElementById("data-container").addEventListener("input", temporarySaveChanges.bind(this));
    }

    function onClick(e){
        if (e.target.closest("#name-list-container")) {
            onListContainerClick(e);
        }
        if (e.target.closest("#delete-student")) {
            deleteStudent();
        }
        if (e.target.closest("#add-subject")) {
            addSubject();
        }
        if (e.target.closest("#add-student")) {
            addStudent();
        }
        if (e.target.closest("#save-student")) {
            saveStudent(e);
        }
        if (e.target.closest(".button_print")) {
            window.print();
        }
        if (e.target.closest(".link-reset-changes")) {
            resetChanges();
        }

        if (e.target.closest(".datepicker")){
            var datapicker = e.target.closest(".datepicker");
            var input = datapicker.querySelector(".input_calendar");
            if (e.target != input) input.dispatchEvent(new Event("click"));
            input.focus();
            input.select();
        }
    }

    function onDataChange(e){
        //don't save if user changes subject diagram
        if (e.target.closest(".subject-list")) return;
        temporarySaveChanges();

    }

    function onInputChange(e){
        //skip datepicker changes
        if (e.target.closest(".input_calendar")) return;

        if (e.target.closest(".form-item__input")) {
            var studentData = unsavedStudentsArray[currentStudentIndex] || studentsArray[currentStudentIndex],
                fullName = studentData.lastName + " " +  studentData.firstName + " " + studentData.secondName;

            checkRules(e.target.closest(".form-item__input"));
            temporarySaveChanges();
            fillField("#full-name",fullName,"text");
            fillField(".name-list__name_current",fullName,"text");
        }
    }

    function initPickmeup(){
        $('.input_calendar').pickmeup({
            hide_on_select: true,
            change: function() {
                temporarySaveChanges();
            }
        });


        var calendars = document.querySelectorAll(".datepicker .input_calendar");
        for (var i=0; i < calendars.length; i++) {

            calendars[i].addEventListener("blur",function(e){
                var calendar = $('.input_calendar');
                calendar.pickmeup('update');
                calendar.pickmeup('hide');
            });
        }

    }

    function onListContainerClick(event){
        if (event.target.closest(".name-list__name")){
            currentStudentIndex = event.target.dataset.indexNumber;
            updateNameListView();
            animateTransition();
            // fillFormFields(currentStudentIndex); //temporary
            // validateAllFields();//temporary
        }
    }

    function animateTransition() {
        // document.querySelector("#data-container").classList.add("data-container--hidden");
        var dataContainer = document.querySelector("#data-container"),
            fullName = document.querySelector("#full-name");

        if (dataContainer.classList.contains("zero-opacity")) return;
        dataContainer.classList.add("zero-opacity");
        fullName.classList.add("zero-opacity");
        dataContainer.addEventListener("transitionend",changeFields);

        function changeFields(){
            fillFormFields(currentStudentIndex);
            validateAllFields();
            dataContainer.classList.remove("zero-opacity");
            fullName.classList.remove("zero-opacity");
            dataContainer.removeEventListener("transitionend",changeFields);
        }
    }

    function addStudent(e) {
        var newStudent = getClone(studentTemplate);
        studentsArray.push(newStudent);
        currentStudentIndex = studentsArray.length - 1;
        addNameToNameList(currentStudentIndex);
        checkSaveButtonState();
    }

    function saveStudent(e) {
        if (e.target.closest(".button-disabled")) return;
        //temporarySaveChanges();
        saveChanges();
    }

    function onListInputBlur(event){
        if (event.target.classList.contains("form-item__input")){
            if (event.target.classList.contains("input_calendar")) return;
            validateField(event.target);
        }
    }

    function onListInputFocus(event){
        if (event.target.classList.contains("form-item__input")){
            resetError(event.target);
        }
    }

    function onSubjectlistChange(event){
        if (event.target.classList.contains("kontur-checkbox")){
            redrawLinechart();
        }
    }

    function fillFormFields(index){
        var studentData = unsavedStudentsArray[index] || studentsArray[index],
            fullName = studentData.lastName + " " +  studentData.firstName + " " + studentData.secondName,
            birthDateString = getDateString(studentData.birthDate),
            enterDateString = getDateString(studentData.enterDate);

        fillField("#full-name",fullName,"text");
        fillField(".name-list__name_current",fullName,"text");
        fillField("#last-name",studentData.lastName);
        fillField("#first-name",studentData.firstName);
        fillField("#second-name",studentData.secondName);
        fillField("#birth-date",birthDateString);
        fillField("#enter-date",enterDateString);

        switch (studentData.gender){
            case "male":
                fillField("#radio-gender_male","checked","radio");
                break;
            case "female":
                fillField("#radio-gender_female","checked","radio");
                break;
        }

        addSubjectsView(studentData);
        drawDonutChart(studentData.lessonsSkipped,studentData.lessonsSkippedFair);

        checkControlsState();

        checkSaveButtonState();

        function checkControlsState(){
            var saveButton = document.getElementById("save-student"),
                deleteButton = document.getElementById("delete-student"),
                blockingArea = document.querySelector(".blocking-area");

            if (studentsArray[index]) {
                showNormalStudentControls();
            } else {
                showDeletedStudentControls();
            }

            function showDeletedStudentControls(){
                saveButton.textContent = "Восстановить запись";
                saveButton.setAttribute("title", "Восстановить запись");

                deleteButton.textContent = "Запись удалена";
                deleteButton.classList.remove("link");
                deleteButton.classList.add("person-data__link--deleted");

                blockingArea.classList.remove("blocking-area--disabled");
            }

            function showNormalStudentControls(){
                saveButton.textContent = "Сохранить изменения";
                saveButton.setAttribute("title", "Сохранить изменения");

                deleteButton.textContent = "Удалить";
                deleteButton.classList.add("link");
                deleteButton.classList.remove("person-data__link--deleted");

                blockingArea.classList.add("blocking-area--disabled");
            }
        }

        function getDateString(dateString) {
            var date,
                dd,
                mm,
                yy;

            dateString = dateString.replace(/\./gi, "-");
            date = new Date(dateString);
            dd = date.getDate();
            mm = date.getMonth() + 1;
            yy = date.getFullYear();

            if (dd < 10) dd = '0' + dd;
            if (mm < 10) mm = '0' + mm;

            return +dd + '.' + mm + '.' + yy;
        }
    }

    function addSubjectsView(studentData) {
        var subjectsView = makeSubjectsView(studentData.subjects);
        insertHtml("subject-list-container",subjectsView);

        var linechartView = makeLinechartView(studentData.subjects);
        insertHtml("linechart-container", linechartView);
        updateLinechartArrays();
        redrawLinechart();
    }

    function makeSubjectsView(subjectArray){
        var subjectViews = [];

        for (var i=0; i < subjectArray.length; i++) {
            var newSubjectView = subjectHtml;
            newSubjectView = insertProperty(newSubjectView,"subjectName",subjectArray[i]);
            newSubjectView = insertProperty(newSubjectView,"subjectNumber",i);
            newSubjectView = insertProperty(newSubjectView,"indexNumber",i);

            subjectViews.push(newSubjectView);
        }

        return subjectViews.join("");
    }

    function makeLinechartView(subjectArray){
        var barsViews = [];

        for (var i=0; i < subjectArray.length; i++) {
            barsViews[i] = makeBar(subjectArray[i],i);
        }

        return barsViews.join("");
    }

    function makeBar(name,index){
        var barColors = [
            "#E8E8E8",
            "#E5E1D1",
            "#52616D",
            "#2C343B",
            "#FFCC5C",
            "#C44741",
            "#0081D4",
            "#C44741",
            "#FFF0F0"],
            colorsCount = barColors.length,
            newBar = linechartBarHtml,
            styles = "";

        styles += " width: 0; ";
        // styles += " width: " + barWidth +  "%; ";
        styles += " background-color: " + (barColors[index%colorsCount])+ " ";

        newBar = insertProperty(newBar,"subjectName",name);
        newBar = insertProperty(newBar,"indexNumber",index);
        newBar = insertProperty(newBar,"styles",styles);
        return newBar;
    }

    function updateNameListView() {
        var listContainer = document.querySelector("#name-list-container");

        if (listContainer.children.length == 0) {
            createNameList();
        }
        updateNameList();

        function createNameList() {
            var resultHtml = "",
                nameListContainer = document.querySelector("#name-list-container");

            for (var i = 0; i < studentsArray.length; i++) {
                resultHtml += createName(i);
            }

            nameListContainer.insertAdjacentHTML("beforeEnd", resultHtml);
        }

        function updateNameList(){
            var currentChild,
                currentIndexNumber,
                studentData,
                fullName;


            for (var i=0; i < listContainer.children.length; i++) {
                currentChild = listContainer.children[i];
                currentIndexNumber = currentChild.dataset.indexNumber;
                studentData = unsavedStudentsArray[currentIndexNumber] || studentsArray[currentIndexNumber];
                fullName = studentData.lastName + " " + studentData.firstName + " " + studentData.secondName;

                currentChild.textContent = fullName;

                checkCurrent();
                checkDeleted();

            }

            sortList();



            function checkCurrent(){
                if (currentIndexNumber == currentStudentIndex){
                    currentChild.classList.add("name-list__name_current");
                } else {
                    currentChild.classList.remove("name-list__name_current");
                }
            }

            function checkDeleted(){
                if (!studentsArray[i]) { //if student is deleted
                    currentChild.classList.add("name-list__name--deleted");
                } else {
                    currentChild.classList.remove("name-list__name--deleted");
                }
            }

            function compareNames(a, b) {
                var aField = a.textContent.toUpperCase(),
                    bField = b.textContent.toUpperCase(),
                    aIndex = +a.dataset.indexNumber,
                    bIndex = +b.dataset.indexNumber;
                if (aField > bField) return 1;
                if (aField < bField) return -1;
                if (aIndex > bIndex) return 1;
                if (aIndex < bIndex) return -1;
                return 0;
            }

            function sortList(){
                var unsortedElements = [];
                var sortedElements = [];
                var elem;
                var rearrangeElementsBound = rearrangeElements.bind(this);

                for (var i=0; i < listContainer.children.length; i++) {
                    currentChild = listContainer.children[i];
                    unsortedElements.push(currentChild);
                    sortedElements.push(currentChild);
                }

                sortedElements.sort(compareNames);

                for (i=0; i < unsortedElements.length; i++) {
                    elem = unsortedElements[i];
                    if (sortedElements.indexOf(elem) != i){
                        var change = sortedElements.indexOf(elem) - i;
                        elem.style.top = change * elem.offsetHeight + "px";

                        elem.parentElement.addEventListener("transitionend",rearrangeElementsBound);
                    }



                }

                function rearrangeElements(e){
                    var elem = sortedElements[0],
                        parent = sortedElements[0].parentElement,
                        nextElem,
                        i;

                    elem.parentElement.removeEventListener("transitionend",rearrangeElementsBound);

                    for (i = sortedElements.length-1; i >= 0 ; i--) {
                        elem = sortedElements[i];
                        if (!sortedElements[i+1]) continue;
                        nextElem = sortedElements[i+1];
                        parent.insertBefore(elem,nextElem);
                        // console.log(elem, nextElem);
                    }

                    // disable transition to avoid unwanted animation
                    sortedElements.forEach(function(e){e.style.transition = "none";});
                    // move with no animation
                    sortedElements.forEach(function(e){e.style.top = "";});
                    // enable transition back
                    setTimeout(function(){
                        sortedElements.forEach(function(e){e.style.transition = "";});
                    },50);

                }



                // console.error(new Error());
            }
        }
    }

    function createName(i){
        var studentData = unsavedStudentsArray[i] || studentsArray[i],
            fullName = studentData.lastName + " " + studentData.firstName + " " + studentData.secondName,
            newNameView = nameListNameHtml;

        newNameView = insertProperty(newNameView, "fullName", fullName);
        newNameView = insertProperty(newNameView, "indexNumber", i);
        return newNameView;
    }

    function addNameToNameList(i){
        var nameListContainer = document.querySelector("#name-list-container"),
            lastNameElement;
        nameListContainer.insertAdjacentHTML("beforeEnd", createName(i));
        lastNameElement = nameListContainer.children[nameListContainer.children.length - 1];
        //new name fade in animation
        lastNameElement.style.color = "transparent";
        setTimeout(function(){lastNameElement.style.color = "";},50);
        updateNameListView();
        animateTransition();
    }

    function fillField(selector, value, type) {
        type = type||"input";
        var field = document.querySelector(selector);
        if (!field) return;

        switch (type){
            case "input":
                field.value = value;
                break;
            case "text":
                field.textContent = value;
                break;
            case "radio":
                field.checked = value;
                break;
        }
    }

    function insertHtml(id, html) {
        var targetElem = document.getElementById(id);
        targetElem.innerHTML = html;
    }

    function insertProperty(string, propName, propValue){
        var propToReplace = "{{" + propName +"}}";

        if (string==undefined){
            string= "";
            console.log("error with "+propName);
        }

        string = string.replace(new RegExp(propToReplace,"g"),propValue);
        return string
    }

    function drawDonutChart(lessonsSkipped,lessonsSkippedFair){

        var donutChartCanvas = document.getElementById("donut-chart-canvas"),
            context = donutChartCanvas.getContext("2d"),
            startPointX = 180,
            startPointY = 180,
            chartRadius = 145,
            holeRadius = 110;

        context.clearRect(0, 0, donutChartCanvas.width, donutChartCanvas.height);

        context.save();
        context.beginPath();
        context.moveTo(startPointX, startPointY);
        context.arc(startPointX, startPointY, chartRadius, 0, 2 * Math.PI, false);
        context.arc(startPointX, startPointY, holeRadius, 0, 2 * Math.PI, false);
        context.fillStyle = "#eeeeee";
        context.shadowColor = "rgba(0,0,0,.14)";
        context.shadowBlur = 8;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 4;
        context.fill("evenodd");

        context.restore();

        context.beginPath();
        context.moveTo(startPointX, startPointY);
        context.arc(startPointX, startPointY, chartRadius, -0.5 * Math.PI, (lessonsSkipped / 100) * 2 * Math.PI - 0.5 * Math.PI, false);
        context.moveTo(startPointX, startPointY);
        context.arc(startPointX, startPointY, holeRadius, -0.5 * Math.PI, (lessonsSkipped / 100) * 2 * Math.PI - 0.5 * Math.PI, false);
        context.fillStyle = "#52616D";
        context.fill("evenodd");


        context.beginPath();
        context.moveTo(startPointX, startPointY);
        context.arc(startPointX, startPointY, chartRadius, -0.5 * Math.PI, (lessonsSkippedFair / 100) * 2 * Math.PI - 0.5 * Math.PI, false);
        context.moveTo(startPointX, startPointY);
        context.arc(startPointX, startPointY, holeRadius, -0.5 * Math.PI, (lessonsSkippedFair / 100) * 2 * Math.PI - 0.5 * Math.PI, false);
        context.fillStyle = "#C44741";
        context.fill("evenodd");


        context.fillStyle = "#000000";
        context.font = "16px sans-serif";

        context.textAlign = "left";

        context.fillText("75", 0, startPointY + 8);

        context.textAlign = "right";
        context.fillText("25", startPointX * 2, startPointY + 8);

        context.textAlign = "center";
        context.fillText("0", startPointX, 20);
        context.fillText("50", startPointX, startPointY * 2 - 5);


        context.fillText("Всего прогуляно:", startPointX, startPointY - 40);

        context.font = "33px sans-serif";
        context.fillText(lessonsSkipped, startPointX, startPointY + 0);

        context.font = "14px sans-serif";
        context.fillText("Из них", startPointX, startPointY + 35);
        context.fillText("по уважительной причине:", startPointX, startPointY + 50);


        context.font = "24px sans-serif";
        context.fillText(lessonsSkippedFair, startPointX, startPointY + 80);
    }

    function validateField(target){
        if (target.value == ""){
            showError(target,VALIDATION_ERROR_MESSAGE);
        } else {
            resetError(target);
        }
    }

    function validateAllFields() {
        var textFields = document.querySelectorAll(".form-item__input");

        for (var i=0; i < textFields.length; i++) {
            if (event.target.classList.contains("input_calendar")) continue;
            validateField(textFields[i]);
        }
    }

    function showError(target, errorMessage) {
        var msgElem = document.createElement('span');
        msgElem.className = "input-error-message";
        msgElem.innerHTML = errorMessage;

        target.parentNode.appendChild(msgElem);
        target.classList.add("input-error");
    }

    function resetError(target) {
        var container = target.parentNode;
        if (container.lastChild.className == "input-error-message") {
            container.removeChild(container.lastChild);
        }
        target.classList.remove("input-error");
    }

    function redrawLinechart(){
        var checkedRadioArray = document.querySelectorAll(".kontur-checkbox:checked"),
            barWidth = 100/checkedRadioArray.length; //in percent of the parent

        for (var i=0; i < barArray.length; i++) {
            if (!radioArray[i].checked){
                barArray[i].style.width = 0;
            } else {
                barArray[i].style.width = barWidth+"%";
            }
        }
    }

    function updateLinechartArrays(){
        var barNodeList = document.querySelectorAll(".linechart__bar"),
            radioNodeList = document.querySelectorAll(".kontur-checkbox");

        barArray = Array.prototype.slice.call(barNodeList);
        radioArray = Array.prototype.slice.call(radioNodeList);

        barArray.sort(compare);
        radioArray.sort(compare);

        function compare(a, b) {
            if (a.dataset.indexNumber > b.dataset.indexNumber) return 1;
            if (a.dataset.indexNumber < b.dataset.indexNumber) return -1;
        }
    }

    function deleteStudent(){
        temporarySaveChanges();
        studentsArray[currentStudentIndex] = null;
        /*studentsArray.splice(currentStudentIndex,1);
        unsavedStudentsArray.splice(currentStudentIndex,1);
        currentStudentIndex--;
        if (currentStudentIndex < 0){
            currentStudentIndex = 0;
        }
        if (studentsArray.length == 0){
            addStudent();
        }*/

        fillFormFields(currentStudentIndex);
    }

    function addSubject(){
        var subjects = document.getElementById("subject-list-container"),
            index = subjects.childElementCount,
            studentData = studentsArray[currentStudentIndex],
            name = "Новый предмет " + (index + 1);

        studentData.subjects.push(name);

        var newSubjectView = subjectHtml;

        newSubjectView = insertProperty(newSubjectView,"subjectName",name);
        newSubjectView = insertProperty(newSubjectView,"subjectNumber",index);
        newSubjectView = insertProperty(newSubjectView,"indexNumber",index);

        subjects.children[subjects.children.length-1].insertAdjacentHTML("afterend", newSubjectView);


        var linechart = document.getElementById("linechart-container");
        var newSubjectBarView = makeBar(name, index);

        linechart.children[linechart.children.length-1].insertAdjacentHTML("afterend", newSubjectBarView);


        updateLinechartArrays();
        redrawLinechart();
    }

    function temporarySaveChanges(){
        var form = document.forms["data-container"],
            newStudentData = {};

        newStudentData.lastName = getFieldData("last-name");
        newStudentData.firstName = getFieldData("first-name");
        newStudentData.secondName = getFieldData("second-name");
        newStudentData.birthDate = getDate(getFieldData("birth-date"));
        newStudentData.enterDate = getDate(getFieldData("enter-date"));
        newStudentData.gender = getFieldData("radio_gender","radio");
        newStudentData.subjects = studentsArray[currentStudentIndex].subjects;
        newStudentData.lessonsSkipped = studentsArray[currentStudentIndex].lessonsSkipped;
        newStudentData.lessonsSkippedFair = studentsArray[currentStudentIndex].lessonsSkippedFair;

        unsavedStudentsArray[currentStudentIndex] = newStudentData;
        checkSaveButtonState();

        function getDate(string){
            var arr = string.split("."),
                yy = arr[2],
                mm = arr[1],
                dd = arr[0];
            return yy + "." + mm + "." + dd;
        }
        function getFieldData(fieldName,type) {
            var field = document.getElementById(fieldName),
                type = type || "input",
                result = "";

            switch (type){
                case "input":
                    if (!field) return;
                    result = field.value;
                    break;

                case "radio":
                    if (!form[fieldName]) return;
                    result = form[fieldName].value;
                    break;
            }

            return result;

            // console.dir(field);
        }
    }

    function saveChanges(){
        var changedStudent = unsavedStudentsArray[currentStudentIndex];
        if (!changedStudent) return;



        studentsArray[currentStudentIndex] = changedStudent;
        unsavedStudentsArray[currentStudentIndex] = null;
        checkSaveButtonState();
        fillFormFields(currentStudentIndex);
        updateNameListView();
    }

    function resetChanges(){
        unsavedStudentsArray[currentStudentIndex] = null;
        checkSaveButtonState();
        fillFormFields(currentStudentIndex);
        updateNameListView();
        validateAllFields();
    }

    function checkSaveButtonState(){
        if (unsavedStudentsArray[currentStudentIndex]){
            document.getElementById("save-student").classList.remove("button-disabled");
            //if student is not deleted
            if (studentsArray[currentStudentIndex]){
                //show reset-changes link
                document.querySelector(".link-reset-changes").classList.remove("link-reset-changes--hidden");
            } else {
                //hide reset-changes link
                document.querySelector(".link-reset-changes").classList.add("link-reset-changes--hidden");
            }
        } else {
            //hide reset-changes link
            document.querySelector(".link-reset-changes").classList.add("link-reset-changes--hidden");
            document.getElementById("save-student").classList.add("button-disabled");
        }
    }

    function getClone(original){
        var clone = JSON.parse(JSON.stringify(original));

        return clone;
    }

    function showLoadingError(e){
        var errorMessage = document.createElement("div");
        errorMessage.innerHTML = errorTemplate.innerHTML;
        document.querySelector(".group-list").insertAdjacentHTML("afterEnd",errorTemplate);
        console.log(e);
    }

    function showGroupList(){
        document.querySelector(".group-list").classList.remove("group-list--hidden");
    }

    function checkRules(elem){
        var text = elem.value,
            cursorStart = elem.selectionStart,
            cursorEnd = elem.selectionEnd;

        elem.value = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        // elem.value = text.replace(/[^A-Za-zА-Яа-яЁё]/g, "");
        elem.value = elem.value.replace(NAME_RULE, "");
        elem.setSelectionRange(cursorStart,cursorEnd);
    }

    global.reloadStudentsData = onDomLoad;


}(window));