// Ilia Matrosov
// 2016

(function(global){
    "use strict";

    document.addEventListener("DOMContentLoaded", onDomLoad);
    
    var VALIDATION_ERROR_MESSAGE = "Поле обязательно к заполнению",
        STUDENT_LIST_URL = "studentsList.json";

    var barArray = [],
        radioArray =[],
        studentsArray,
        subjectHtml,
        linechartBarHtml,
        nameListNameHtml,
        currentStudentIndex = 0;


    function onDomLoad(){
        $ajaxUtils.sendGetRequest(STUDENT_LIST_URL,
                        function(parsedObject){
                            studentsArray = parsedObject.students;
                            convertDate(studentsArray);
                            onDataLoad();
                        });

        getTemplates();
    }

    function getTemplates(){
        subjectHtml = document.querySelector('#template--subject').innerHTML,
        linechartBarHtml = document.querySelector('#template--linechart-bar').innerHTML,
        nameListNameHtml = document.querySelector('#template--name-list__name').innerHTML;
    }

    function onDataLoad(){
        fillFormFields(currentStudentIndex);
        createEmptyStudentObj();
        addListeners();
        initPickmeup();
    }

    function addListeners(){
        document.getElementById("name-list-container").addEventListener("click", onListContainerClick);
        document.getElementById("delete-student").addEventListener("click", deleteStudent);
        document.getElementById("add-subject").addEventListener("click", addSubject);
        document.getElementById("data-container").addEventListener("blur", onListInputBlur,true);
        document.getElementById("data-container").addEventListener("focus", onListInputFocus,true);
        document.getElementById("subject-list-container").addEventListener("change", onSubjectlistChange);
    }

    function initPickmeup(){
        $('.input_calendar').pickmeup();

        var calendars = document.querySelectorAll(".input_calendar");
        for (var i=0; i < calendars.length; i++) {
            calendars[i].addEventListener("click",function(e){
                this.select();
                var siblings = this.parentElement.children;
                siblings[siblings.length-1].classList.add("button_calendar-active");
            });
            calendars[i].addEventListener("blur",function(e){
                var calendar = $('.input_calendar');
                calendar.pickmeup('update');
                calendar.pickmeup('hide');

                var siblings = this.parentElement.children;
                siblings[siblings.length-1].classList.remove("button_calendar-active");
            });

        }
    }

    function onListContainerClick(event){
        if (event.target.classList.contains("name-list__name")){
            currentStudentIndex = event.target.dataset.indexNumber;
            fillFormFields(currentStudentIndex);
            validateAllFields();
        }
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
        var studentData = studentsArray[index],
            fullName = studentData.lastName + " " +  studentData.firstName + " " + studentData.secondName,
            birthDateString = getDateString(studentData.birthDate),
            enterDateString = getDateString(studentData.enterDate),
            nameListView = makeNameListView(studentsArray);

        fillField("full-name",fullName,"text");
        fillField("current-name",fullName,"text");
        fillField("last-name",studentData.lastName);
        fillField("first-name",studentData.firstName);
        fillField("second-name",studentData.secondName);
        fillField("birth-date",birthDateString);
        fillField("enter-date",enterDateString);

        switch (studentData.gender){
            case "male":
                fillField("radio-gender_male","checked","radio");
                break;
            case "female":
                fillField("radio-gender_female","checked","radio");
                break;
        }

        addSubjectsView(studentData);
        insertHtml("name-list-container",nameListView);
        drawDonutChart(studentData.lessonsSkipped,studentData.lessonsSkippedFair);
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

    function makeNameListView(studentsArray) {
        var namesViews = [];

        for (var i=0; i < studentsArray.length; i++) {
            if(i == currentStudentIndex) continue;

            var studentData = studentsArray[i],
                fullName = studentData.lastName + " " +  studentData.firstName + " " + studentData.secondName,
                newNameView = nameListNameHtml;

            newNameView = insertProperty(newNameView,"fullName",fullName);
            newNameView = insertProperty(newNameView,"indexNumber",i);
            namesViews[i] = newNameView;
        }

        return namesViews.join("");
    }

    function fillField(fieldName, value, type) {
        type = type||"input";
        var field = document.getElementById(fieldName);

        switch (type){
            case "input":
                field.value = value;
                break;
            case "text":
                field.textContent = value;
                break;
            case "radio":
                field.checked = value;
        }

        // console.dir(field);
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

    function convertDate(studentsArray){
        for (var i=0; i < studentsArray.length; i++) {
            studentsArray[i].birthDate = new Date(Date.parse(studentsArray[i].birthDate));
            studentsArray[i].enterDate = new Date(Date.parse(studentsArray[i].enterDate));
        }
    }

    function getDateString(date) {
        var dd = date.getDate();
        if (dd < 10) dd = '0' + dd;

        var mm = date.getMonth() + 1;
        if (mm < 10) mm = '0' + mm;

        var yy = date.getFullYear();

        return dd + '.' + mm + '.' + yy;
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
        console.dir(textFields);

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
        studentsArray.splice(currentStudentIndex,1);
        fillFormFields(currentStudentIndex);
        //TODO if no more students there is an error
    }

    function createEmptyStudentObj() {
        // var emptyObj = {};
        // studentObj = studentsArray[0];
        // // console.dir(studentObj);
        //
        //
        // for (var key in studentObj){
        //     emptyObj[key] = {}
        //     console.log(key + " " + typeof studentObj[key]);
        //     switch (typeof studentObj[key]){
        //         case "string":
        //             emptyObj[key] = "";
        //             break;
        //     }
        //
        // }
        //
        // console.dir(emptyObj);
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


}(window));