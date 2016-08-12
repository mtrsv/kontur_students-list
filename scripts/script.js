(function(global){
    "use strict";

    document.addEventListener("DOMContentLoaded", onDomLoad);

    var currentStudentIndex = 0;

    var barArray = [];
    var radioArray = [];

    var studentsListUrl = "../studentsList.json";
    var subjectHtmlUrl = "../snippets/subject.html";
    var linechartBarHtmlUrl = "../snippets/linechart-bar.html";
    var nameListNameHtmlUrl = "../snippets/name-list__name.html";

    var studentsArray,
        subjectHtml,
        linechartBarHtml,
        nameListNameHtml;

    function onDomLoad(){

        $ajaxUtils.sendGetRequest(studentsListUrl,
                        function(parsedObject){
                            studentsArray = parsedObject.students;
                            convertDate(studentsArray);
                            checkSnippetsLoaded();
                        });

        $ajaxUtils.sendGetRequest(subjectHtmlUrl,
                        function(response){
                            subjectHtml = response;
                            checkSnippetsLoaded();
                        },false);

        $ajaxUtils.sendGetRequest(linechartBarHtmlUrl,
                        function(response){
                            linechartBarHtml = response;
                            checkSnippetsLoaded();
                        },false);

        $ajaxUtils.sendGetRequest(nameListNameHtmlUrl,
                        function(response){
                            nameListNameHtml = response;
                            checkSnippetsLoaded();
                        },false);

    }

    function checkSnippetsLoaded(){
        if (!studentsArray) return;
        if (!subjectHtml) return;
        if (!linechartBarHtml) return;
        if (!nameListNameHtml) return;

        onDataLoad();
    }

    function onDataLoad(){
        fillFormFields(currentStudentIndex);
        createEmptyStudentObj();
        document.getElementById("name-list-container").addEventListener("click", onListContainerClick);
        document.getElementById("data-container").addEventListener("blur", onListInputBlur,true);
        document.getElementById("data-container").addEventListener("focus", onListInputFocus,true);
        document.getElementById("subject-list-container").addEventListener("change", onSubjectlistChange);
        document.getElementById("delete-student").addEventListener("click", deleteStudent);
        document.getElementById("add-subject").addEventListener("click", addSubject);

        $('.input_calendar').pickmeup();
        
        var calendars = document.querySelectorAll(".input_calendar");
        for (var i=0; i < calendars.length; i++) {
            calendars[i].addEventListener("click",function(e){
                this.select();
                
                var siblings = this.parentElement.children;
                siblings[siblings.length-1].classList.add("button_calendar-active");
            });
            calendars[i].addEventListener("blur",function(e){
                $('.input_calendar').pickmeup('update');
                $('.input_calendar').pickmeup('hide');

                var siblings = this.parentElement.children;
                siblings[siblings.length-1].classList.remove("button_calendar-active");
            });

        }
    }


    function onListContainerClick(event){
        if (event.target.classList.contains("name-list__name")){
            currentStudentIndex = event.target.dataset.indexNumber;
            fillFormFields(currentStudentIndex);
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
            var radioState = event.target.checked;
            var barIndex = event.target.dataset.indexNumber;
            redrawLinechart();
        }
    }


    function fillFormFields(index){
        var studentData = studentsArray[index];

        var fullName = studentData.lastName + " " +  studentData.firstName + " " + studentData.secondName;
        fillField("full-name",fullName,"text");
        fillField("current-name",fullName,"text");

        fillField("last-name",studentData.lastName);
        fillField("first-name",studentData.firstName);
        fillField("second-name",studentData.secondName);

        switch (studentData.gender){
            case "male":
                fillField("radio-gender_male","checked","radio");
                break;
            case "female":
                fillField("radio-gender_female","checked","radio");
                break;
        }

        // getFullYear()
        // getMonth()
        // getDate()

        var birthDateString = getDateString(studentData.birthDate);
        fillField("birth-date",birthDateString);

        var enterDateString = getDateString(studentData.enterDate);
        fillField("enter-date",enterDateString);


        addSubjectsView(studentData);

        var nameListView = makeNameListView(studentsArray);
        insertHtml("name-list-container",nameListView);

        makeDonutChart(studentData.lessonsSkipped,studentData.lessonsSkippedFair);
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
            "#FFF0F0"];
        var colorsCount = barColors.length;
        // var barWidth = 100/subjectArray.length;

        var newBar = linechartBarHtml;

        var styles = "";
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
            var studentData = studentsArray[i];
            var fullName = studentData.lastName + " " +  studentData.firstName + " " + studentData.secondName;

            var newNameView = nameListNameHtml;
            newNameView = insertProperty(newNameView,"fullName",fullName);
            newNameView = insertProperty(newNameView,"indexNumber",i);

            namesViews[i] = newNameView;
        }

        return namesViews.join("");
    }

    function fillField(fieldName,value,type) {
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

    function makeDonutChart(lessonsSkipped,lessonsSkippedFair){

        var donutChartCanvas = document.getElementById("donut-chart-canvas");
        var context = donutChartCanvas.getContext("2d");
        var startPointX = 180;
        var startPointY = 180;
        var chartRadius = 145;
        var holeRadius = 110;

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
            showError(target,"Поле обязательно к заполнению");
        }
    }

    function showError(target, errorMessage) {
        var msgElem = document.createElement('span');
        msgElem.className = "input-error-message";
        msgElem.innerHTML = errorMessage;

        target.parentNode.appendChild(msgElem);
        target.classList.add("input-error");
    //    input-error
    }

    function resetError(target) {
        var container = target.parentNode;
        if (container.lastChild.className == "input-error-message") {
            container.removeChild(container.lastChild);
        }
        target.classList.remove("input-error");
    }


    function redrawLinechart(){
        var checkedRadioArray = document.querySelectorAll(".kontur-checkbox:checked");

        var barWidth = 100/checkedRadioArray.length;
        for (var i=0; i < barArray.length; i++) {
            if (!radioArray[i].checked){
                barArray[i].style.width = 0;
            } else {
                barArray[i].style.width = barWidth+"%";
            }
        }
    }

    function updateLinechartArrays(){

        var barNodeList = document.querySelectorAll(".linechart__bar");
        var radioNodeList = document.querySelectorAll(".kontur-checkbox");

        barArray = Array.prototype.slice.call(barNodeList);
        radioArray = Array.prototype.slice.call(radioNodeList);

        barArray.sort(compare);
        radioArray.sort(compare);

        function compare(a, b) {
            // console.log(a.dataset.indexNumber,b.dataset.indexNumber);
            if (a.dataset.indexNumber > b.dataset.indexNumber) return 1;
            if (a.dataset.indexNumber < b.dataset.indexNumber) return -1;
        }
    }

    function deleteStudent(){
        studentsArray.splice(currentStudentIndex,1);
        fillFormFields(currentStudentIndex);
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


        var subjects = document.getElementById("subject-list-container");
        var index = subjects.childElementCount;
        var studentData = studentsArray[currentStudentIndex];
        var name = "Новый предмет " + (index + 1);
        studentData.subjects.push(name);

        var newSubjectView = subjectHtml;

        newSubjectView = insertProperty(newSubjectView,"subjectName",name);
        newSubjectView = insertProperty(newSubjectView,"subjectNumber",index);
        newSubjectView = insertProperty(newSubjectView,"indexNumber",index);

        subjects.lastChild.insertAdjacentHTML("afterend", newSubjectView);


        var linechart = document.getElementById("linechart-container");
        var newSubjectBarView = makeBar(name, index);

        linechart.lastChild.insertAdjacentHTML("afterend", newSubjectBarView);


        updateLinechartArrays();
        redrawLinechart();
    }


}(window));