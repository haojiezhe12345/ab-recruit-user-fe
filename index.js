function previewImg() {
    var imgUploadInput = document.getElementById('uploadImgPicker')

    if (imgUploadInput.files.length === 0) {
        console.log('No file chosen')
        return;
    }

    imgfile = imgUploadInput.files[0]
    //console.log(imgfile)
    if (!imgfile.type.match(/image.*/)) {
        console.warn(`Invalid image file ${imgfile.name}`)
        return;
    }

    let fileReader = new FileReader();
    fileReader.onload = () => {
        document.getElementById('imgPreview').src = fileReader.result
        document.getElementById('imgPreview').style.display = 'block'
    }
    fileReader.readAsDataURL(imgfile);

    imgUploadInput.value = ''
}

function addAttachments() {
    var fileinput = document.getElementById('uploadAttachmentsPicker')

    if (fileinput.files.length === 0) {
        console.log('No file chosen')
        return;
    }

    for (let file of fileinput.files) {
        //console.log(file)
        attachmentsList.push(file)

        document.getElementById('attachmentsListEl').appendChild(html2elmnt(`
            <li class="mdc-list-item attachmentEl">
                <span class="mdc-list-item__ripple"></span>
                <span class="mdc-list-item__text">${file.name}</span>
                <button class="mdc-icon-button material-icons attachmentElDelBtn" onclick="removeAttachment(${document.getElementsByClassName('attachmentEl').length})">
                    <div class="mdc-icon-button__ripple"></div>
                    delete
                </button>
            </li>
        `))
        mdc.ripple.MDCRipple.attachTo(document.querySelector('.attachmentEl:last-child'))
    }

    fileinput.value = ''
}

function removeAttachment(x) {
    attachmentsList.splice(x, 1)
    document.getElementsByClassName('attachmentEl')[x].remove()
    var attachmentElDelBtns = document.getElementsByClassName('attachmentElDelBtn')
    for (let i = 0; i < attachmentElDelBtns.length; i++) {
        attachmentElDelBtns[i].setAttribute('onclick', `removeAttachment(${i})`)
    }
}

function uploadFiles(formData, filecount) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", `${document.getElementById('BEAddress').value}/admin/upload?filecount=${filecount}`);
        xhr.onload = function () {
            if (xhr.readyState == 4) {
                resolve(xhr.responseText)
            }
        };
        xhr.onerror = function (e) {
            resolve(xhr.statusText)
        }
        xhr.send(formData);
    })
}

function uploadStuInfo(obj) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", `${document.getElementById('BEAddress').value}/admin/student`);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onload = function () {
            if (xhr.readyState == 4) {
                resolve(xhr.responseText)
            }
        };
        xhr.onerror = function (e) {
            resolve(xhr.statusText)
        }
        xhr.send(JSON.stringify(obj));
    })
}

async function submitForm(isNotSketch) {

    var buttonEl = document.getElementById('submitBtn')

    function showSnackbar(msg) {
        snackbar.close()
        document.querySelector('.mdc-snackbar').querySelector('.mdc-snackbar__actions').style.display = 'none'
        snackbar.labelText = msg
        snackbar.open()
    }

    function showFailSnackbar(msg) {
        document.getElementById('submitProgress').style.display = 'none'
        buttonEl.disabled = false
        submitConfirmDialog.close()

        showSnackbar(msg)
    }

    document.getElementById('submitProgress').style.display = 'flex'

    if (!isNotSketch) showSnackbar('正在保存草稿…')

    var rspCode = undefined

    // upload photo
    if (imgfile) {
        document.getElementById('progressText').innerHTML = '正在上传照片'
        var photoUploadFormData = new FormData();
        photoUploadFormData.append('files', imgfile)
        var photoUploadResponse = await uploadFiles(photoUploadFormData, 1)
        console.log(photoUploadResponse)

        try {
            var photoUploadResponseJSON = JSON.parse(photoUploadResponse)
            rspCode = photoUploadResponseJSON.code
        } catch { }
        if (rspCode !== 1) {
            showFailSnackbar(`照片上传失败: ${photoUploadResponse}`)
            return
        }
        rspCode = undefined
    }

    // upload attachments
    if (attachmentsList.length > 0) {
        document.getElementById('progressText').innerHTML = '正在上传附件'
        var attachmentsUploadFormData = new FormData();
        for (let i = 0; i < attachmentsList.length; i++) {
            attachmentsUploadFormData.append('files', attachmentsList[i])
        }
        var attachmentsUploadResponse = await uploadFiles(attachmentsUploadFormData, attachmentsList.length)
        console.log(attachmentsUploadResponse)

        try {
            var attachmentsUploadResponseJSON = JSON.parse(attachmentsUploadResponse)
            rspCode = attachmentsUploadResponseJSON.code
        } catch { }
        if (rspCode !== 1) {
            showFailSnackbar(`附件上传失败: ${attachmentsUploadResponse}`)
            return
        }
        rspCode = undefined
    }

    // upload form
    document.getElementById('progressText').innerHTML = '正在上传学生信息'
    var stuData = {
        studentId: stuInfoEls.ID.value,
        grade: stuInfoEls.grade.value,
        name: stuInfoEls.name.value,
        gender: (stuInfoEls.gender.value != '') ? ((stuInfoEls.gender.value == '男') ? 1 : 2) : 0,
        major: stuInfoEls.pro.value,
        classNumber: parseInt(stuInfoEls.class.value),
        phoneNumber: stuInfoEls.phone.value,
        wxNumber: stuInfoEls.WeChat.value,
        firstIntro: stuInfoEls.intro1.value,
        secondIntro: stuInfoEls.intro2.value,
        thirdIntro: stuInfoEls.intro3.value,
        // not inserted !!!
        awards: stuInfoEls.awards.value,
        image: '',
        attachments: [],
        remark: stuInfoEls.notes.value,
    }
    if (imgfile) {
        stuData.image = photoUploadResponseJSON.data[0]
    } else if (document.getElementById('imgPreview').dataset.uuid) {
        stuData.image = document.getElementById('imgPreview').dataset.uuid
    }
    for (let i = 0; i < document.getElementsByClassName('attachmentUUIDEl').length; i++) {
        stuData.attachments.push({
            attachment: document.getElementsByClassName('attachmentUUIDEl')[i].dataset.uuid,
            fileName: document.getElementsByClassName('attachmentUUIDEl')[i].querySelector('.mdc-list-item__text').innerHTML,
            id: 0,
            stu_id: 0
        })
    }
    if (attachmentsList.length > 0) {
        for (let i = 0; i < attachmentsUploadResponseJSON.data.length; i++) {
            stuData.attachments.push({
                attachment: attachmentsUploadResponseJSON.data[i],
                fileName: attachmentsList[i].name,
                id: 0,
                stu_id: 0
            })
        }
    }
    stuData.flag = isNotSketch ? 1 : 0
    //stuData.id = 0
    console.log(stuData)

    var stuInfoUploadResponse = await uploadStuInfo(stuData)
    console.log(stuInfoUploadResponse)

    try {
        var attachmentsUploadResponseJSON = JSON.parse(stuInfoUploadResponse)
        rspCode = attachmentsUploadResponseJSON.code
    } catch { }
    if (rspCode !== 1) {
        showFailSnackbar(`学生信息上传失败: ${stuInfoUploadResponse}`)
        return
    }
    rspCode = undefined


    setTimeout(() => {
        document.getElementById('submitProgress').style.display = 'none'
        buttonEl.disabled = false
        submitConfirmDialog.close()

        if (isNotSketch) {
            document.getElementById('formPage').style.display = 'none'
            document.getElementById('finishPage').style.display = 'flex'

            document.getElementById('status').innerHTML = '已投递, 可修改信息'
            document.getElementById('status').style.color = 'green'
            document.getElementById('submitBtnBottomText').innerHTML = '修改信息'
        } else {
            showSnackbar('草稿保存成功!')

            document.getElementById('status').innerHTML = '未提交'
            document.getElementById('status').style.color = 'red'
            document.getElementById('submitBtnBottomText').innerHTML = '提交'
        }

    }, isNotSketch ? 1000 : 200);

}

async function initBGImgs(diff) {
    var xhr = new XMLHttpRequest()
    xhr.open("GET", `${document.getElementById('BEAddress').value}/getPtInfo?diff=${diff}`);
    xhr.onload = function () {
        if (xhr.readyState == 4) {
            console.log(xhr.responseText)
            rsp = JSON.parse(xhr.responseText)
            if (rsp.code === 1) {
                if (diff === 0) {
                    document.getElementById('welcomePage').style.backgroundImage = `url(api/${rsp.data.image})`
                } else if (diff === 1) {
                    document.getElementById('formHeaderImg').src = `api/${rsp.data.image}`
                }
            }
        }
    };
    xhr.send();
}

async function loadStuInfo(code = wxcode) {
    document.getElementById('welcomePage').style.display = 'none'
    document.getElementById('formPage').style.display = 'block'

    document.getElementById('wxcode').innerHTML = 'wx_login_code = ' + code

    var loadUserInfoResponse = await new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest()
        xhr.open("GET", `${document.getElementById('BEAddress').value}/getUserInfo?code=${code}`);
        xhr.onload = function () {
            if (xhr.readyState == 4) {
                resolve(xhr.responseText)
            }
        };
        xhr.send();
    })
    console.log(loadUserInfoResponse)

    var loadStuInfoResponse = await new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", `${document.getElementById('BEAddress').value}/getStuInfo`);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onload = function () {
            if (xhr.readyState == 4) {
                resolve(xhr.responseText)
            }
        };
        xhr.onerror = function (e) {
            resolve(xhr.statusText)
        }
        xhr.send();
    })
    console.log(loadStuInfoResponse)

    try {
        var loadStuInfoResponseJSON = JSON.parse(loadStuInfoResponse)
    } catch (error) {
        document.getElementById('status').innerHTML = error
        document.getElementById('status').style.color = 'red'
    }

    if (loadStuInfoResponseJSON.code === 1) {

        if (loadStuInfoResponseJSON.data.flag === 0) {
            document.getElementById('status').innerHTML = '未提交'
            document.getElementById('status').style.color = 'red'
            document.getElementById('submitBtnBottomText').innerHTML = '提交'
        } else if (loadStuInfoResponseJSON.data.flag === 1) {
            document.getElementById('status').innerHTML = '已投递, 可修改信息'
            document.getElementById('status').style.color = 'green'
            document.getElementById('submitBtnBottomText').innerHTML = '修改信息'
        }

        loadStuInfoResponseJSON.data.studentId ? (stuInfoEls.ID.value = loadStuInfoResponseJSON.data.studentId) : undefined
        loadStuInfoResponseJSON.data.grade ? (stuInfoEls.grade.value = loadStuInfoResponseJSON.data.grade) : undefined
        loadStuInfoResponseJSON.data.name ? (stuInfoEls.name.value = loadStuInfoResponseJSON.data.name) : undefined
        loadStuInfoResponseJSON.data.gender ? (stuInfoEls.gender.value = ((loadStuInfoResponseJSON.data.gender === 1) ? '男' : '女')) : undefined
        loadStuInfoResponseJSON.data.major ? (stuInfoEls.pro.value = loadStuInfoResponseJSON.data.major) : undefined
        loadStuInfoResponseJSON.data.classNumber ? (stuInfoEls.class.value = loadStuInfoResponseJSON.data.classNumber) : undefined
        loadStuInfoResponseJSON.data.phoneNumber ? (stuInfoEls.phone.value = loadStuInfoResponseJSON.data.phoneNumber) : undefined
        loadStuInfoResponseJSON.data.wxNumber ? (stuInfoEls.WeChat.value = loadStuInfoResponseJSON.data.wxNumber) : undefined
        loadStuInfoResponseJSON.data.firstIntro ? (stuInfoEls.intro1.value = loadStuInfoResponseJSON.data.firstIntro) : undefined
        loadStuInfoResponseJSON.data.secondIntro ? (stuInfoEls.intro2.value = loadStuInfoResponseJSON.data.secondIntro) : undefined
        loadStuInfoResponseJSON.data.thirdIntro ? (stuInfoEls.intro3.value = loadStuInfoResponseJSON.data.thirdIntro) : undefined
        loadStuInfoResponseJSON.data.awards ? (stuInfoEls.awards.value = loadStuInfoResponseJSON.data.awards) : undefined
        loadStuInfoResponseJSON.data.remark ? (stuInfoEls.notes.value = loadStuInfoResponseJSON.data.remark) : undefined

        if (loadStuInfoResponseJSON.data.image) {
            document.getElementById('imgPreview').src = `${document.getElementById('BEAddress').value}/${loadStuInfoResponseJSON.data.image}`
            document.getElementById('imgPreview').dataset.uuid = loadStuInfoResponseJSON.data.image
        }

        if (loadStuInfoResponseJSON.data.attachments) {
            for (file of loadStuInfoResponseJSON.data.attachments) {
                document.getElementById('attachmentsListEl').appendChild(html2elmnt(`
                    <li class="mdc-list-item attachmentUUIDEl" data-uuid="${file.attachment}">
                        <span class="mdc-list-item__ripple"></span>
                        <span class="mdc-list-item__text">${file.fileName}</span>
                        <button class="mdc-icon-button material-icons" onclick="this.parentNode.remove()">
                            <div class="mdc-icon-button__ripple"></div>
                            delete
                        </button>
                    </li>
                `))
                mdc.ripple.MDCRipple.attachTo(document.querySelector('.attachmentUUIDEl:last-child'))
            }
        }

    } else if (loadStuInfoResponseJSON.code === 0) {
        location.replace('/#auto-login')
    }
}

function html2elmnt(html) {
    var t = document.createElement('template');
    t.innerHTML = html;
    return t.content;
}

function getQueryParam(param) {
    return new URLSearchParams(window.location.search).get(param);
}

initBGImgs(0)
initBGImgs(1)

if (location.hash == '#auto-login') {
    document.getElementById('enterFormButton').click()
}

var wxcode = getQueryParam('code')
if (wxcode != null && wxcode != '') {
    loadStuInfo()
}

var imgfile = null
var attachmentsList = []
