// Constants
const SHEET_NAME = 'Patients';
const ITEMS_PER_PAGE = 10;
const API_URL_ORIGINAL = "https://script.google.com/macros/s/AKfycbx-TQojT-M16MZy50zy1lZzU5_QPPV1rilGM6DeH1r39FmWxHJJGr-RlpB2r-4ZMaKI/exec";
const API_URL = `https://api.allorigins.win/raw?url=${encodeURIComponent(API_URL_ORIGINAL)}`;
// Global variables
let allPatients = [];
let currentPage = 1;
let currentPatientId = null;

// DOM ready
document.addEventListener('DOMContentLoaded', function() {
    // Initial load
    loadPatients();
    
    // Event listeners
    document.getElementById('btnAddPatient').addEventListener('click', () => {
        document.getElementById('add-tab').click();
    });
    
    document.getElementById('btnSearch').addEventListener('click', searchPatients);
    document.getElementById('searchInput').addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            searchPatients();
        }
    });
    
    document.getElementById('statusFilter').addEventListener('change', filterPatients);
    document.getElementById('addPatientForm').addEventListener('submit', addPatient);
    document.getElementById('btnResetForm').addEventListener('click', resetForm);
    
    // Setup Bootstrap tabs
    const triggerTabList = Array.from(document.querySelectorAll('#patientTabs button'));
    triggerTabList.forEach(triggerEl => {
        triggerEl.addEventListener('click', event => {
            event.preventDefault();
            const tabTrigger = new bootstrap.Tab(triggerEl);
            tabTrigger.show();
        });
    });
});

// Load patients from Google Sheets
function loadPatients() {
    showLoading();
    
    // Fetch data from API
    fetch(`${API_URL}?action=getAllPatients`)
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                allPatients = result.data;
                renderPatients(allPatients);
            } else {
                console.error('Error loading patients:', result.error);
                alert('Không thể tải danh sách bệnh nhân: ' + result.error);
            }
            hideLoading();
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            alert('Lỗi kết nối với máy chủ. Vui lòng thử lại sau.');
            hideLoading();
        });
}

// Render patients table
function renderPatients(patients) {
    const tableBody = document.getElementById('patientTableBody');
    tableBody.innerHTML = '';
    
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedPatients = patients.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    
    if (paginatedPatients.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center">Không tìm thấy bệnh nhân nào</td></tr>`;
        document.getElementById('pagination').innerHTML = '';
        return;
    }
    
    paginatedPatients.forEach(patient => {
        const fullName = `${patient.last_name} ${patient.first_name}`;
        const statusBadge = patient.status === 'active' 
            ? '<span class="badge bg-success badge-status">Đang hoạt động</span>' 
            : '<span class="badge bg-secondary badge-status">Không hoạt động</span>';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${patient.patient_id}</td>
            <td>${fullName}</td>
            <td>${formatDate(patient.date_of_birth)}</td>
            <td>${patient.gender}</td>
            <td>${patient.phone}</td>
            <td>${patient.email || ''}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary view-patient" data-id="${patient.patient_id}">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-success edit-patient" data-id="${patient.patient_id}">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger delete-patient" data-id="${patient.patient_id}">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // Add event listeners to buttons
    document.querySelectorAll('.view-patient').forEach(btn => {
        btn.addEventListener('click', () => viewPatient(btn.getAttribute('data-id')));
    });
    
    document.querySelectorAll('.edit-patient').forEach(btn => {
        btn.addEventListener('click', () => editPatient(btn.getAttribute('data-id')));
    });
    
    document.querySelectorAll('.delete-patient').forEach(btn => {
        btn.addEventListener('click', () => confirmDeletePatient(btn.getAttribute('data-id')));
    });
    
    // Render pagination
    renderPagination(patients.length);
}

// Render pagination controls
function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    if (totalPages <= 1) {
        return;
    }
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<button class="page-link" ${currentPage === 1 ? 'disabled' : ''}>Trước</button>`;
    if (currentPage > 1) {
        prevLi.querySelector('button').addEventListener('click', () => {
            currentPage--;
            renderPatients(allPatients);
        });
    }
    pagination.appendChild(prevLi);
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<button class="page-link">${i}</button>`;
        li.querySelector('button').addEventListener('click', () => {
            currentPage = i;
            renderPatients(allPatients);
        });
        pagination.appendChild(li);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<button class="page-link" ${currentPage === totalPages ? 'disabled' : ''}>Tiếp</button>`;
    if (currentPage < totalPages) {
        nextLi.querySelector('button').addEventListener('click', () => {
            currentPage++;
            renderPatients(allPatients);
        });
    }
    pagination.appendChild(nextLi);
}

// Search patients
function searchPatients() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    if (!searchTerm) {
        renderPatients(allPatients);
        return;
    }
    
    showLoading();
    
    // Use API for search if available
    fetch(`${API_URL}?action=searchPatients&searchTerm=${encodeURIComponent(searchTerm)}`)
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                currentPage = 1;
                renderPatients(result.data);
            } else {
                console.error('Error searching patients:', result.error);
                // Fallback to client-side search if API fails
                clientSideSearch(searchTerm);
            }
            hideLoading();
        })
        .catch(error => {
            console.error('Error searching:', error);
            // Fallback to client-side search
            clientSideSearch(searchTerm);
            hideLoading();
        });
}

// Client-side search as fallback
function clientSideSearch(searchTerm) {
    const filteredPatients = allPatients.filter(patient => {
        const fullName = `${patient.last_name} ${patient.first_name}`.toLowerCase();
        return (
            patient.patient_id.toLowerCase().includes(searchTerm) ||
            fullName.includes(searchTerm) ||
            patient.phone.includes(searchTerm) ||
            (patient.email && patient.email.toLowerCase().includes(searchTerm)) ||
            (patient.id_number && patient.id_number.includes(searchTerm))
        );
    });
    
    currentPage = 1;
    renderPatients(filteredPatients);
}

// Filter patients by status
function filterPatients() {
    const statusFilter = document.getElementById('statusFilter').value;
    
    if (statusFilter === 'all') {
        renderPatients(allPatients);
        return;
    }
    
    showLoading();
    
    // Use API for filtering
    fetch(`${API_URL}?action=filterPatientsByStatus&status=${encodeURIComponent(statusFilter)}`)
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                currentPage = 1;
                renderPatients(result.data);
            } else {
                console.error('Error filtering patients:', result.error);
                // Fallback to client-side filtering
                clientSideFilter(statusFilter);
            }
            hideLoading();
        })
        .catch(error => {
            console.error('Error filtering:', error);
            // Fallback to client-side filtering
            clientSideFilter(statusFilter);
            hideLoading();
        });
}

// Client-side filter as fallback
function clientSideFilter(status) {
    const filteredPatients = allPatients.filter(patient => patient.status === status);
    currentPage = 1;
    renderPatients(filteredPatients);
}

// Add new patient
function addPatient(event) {
    event.preventDefault();
    showLoading();
    
    // Get form data
    const formData = {
        first_name: document.getElementById('firstName').value,
        last_name: document.getElementById('lastName').value,
        date_of_birth: document.getElementById('dateOfBirth').value,
        gender: document.getElementById('gender').value,
        id_number: document.getElementById('idNumber').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value || '',
        address: document.getElementById('address').value || '',
        emergency_contact_name: document.getElementById('emergencyContactName').value || '',
        emergency_contact_phone: document.getElementById('emergencyContactPhone').value || '',
        blood_type: document.getElementById('bloodType').value || '',
        allergies: formatJsonField(document.getElementById('allergies').value),
        medical_history: formatJsonField(document.getElementById('medicalHistory').value),
        insurance_provider: document.getElementById('insuranceProvider').value || '',
        insurance_id: document.getElementById('insuranceId').value || ''
    };
    
    // Post to API
    fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'addPatient',
            patientData: formData
        })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            resetForm();
            document.getElementById('list-tab').click();
            loadPatients(); // Reload to get the latest data with new ID
            alert('Bệnh nhân mới đã được thêm thành công!');
        } else {
            console.error('Error adding patient:', result.error);
            alert('Lỗi khi thêm bệnh nhân: ' + result.error);
        }
        hideLoading();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Lỗi kết nối với máy chủ. Vui lòng thử lại sau.');
        hideLoading();
    });
}

// View patient details
function viewPatient(patientId) {
    showLoading();
    currentPatientId = patientId;
    
    fetch(`${API_URL}?action=getPatientById&patientId=${encodeURIComponent(patientId)}`)
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                const patient = result.data;
                
                // Switch to view tab
                document.getElementById('view-tab').click();
                
                // Parse JSON strings
                const allergies = parseJsonField(patient.allergies);
                const medicalHistory = parseJsonField(patient.medical_history);
                
                // Format allergies for display
                let allergiesList = '';
                if (Object.keys(allergies).length > 0) {
                    allergiesList = '<ul>';
                    for (const [allergen, severity] of Object.entries(allergies)) {
                        allergiesList += `<li><strong>${allergen}</strong>: ${severity}</li>`;
                    }
                    allergiesList += '</ul>';
                } else {
                    allergiesList = '<p>Không có dị ứng</p>';
                }
                
                // Format medical history for display
                let historyList = '';
                if (Object.keys(medicalHistory).length > 0) {
                    historyList = '<ul>';
                    for (const [condition, detail] of Object.entries(medicalHistory)) {
                        historyList += `<li><strong>${condition}</strong>: ${detail}</li>`;
                    }
                    historyList += '</ul>';
                } else {
                    historyList = '<p>Không có tiền sử bệnh</p>';
                }
                
                // Build detail view
                const detailHtml = `
                    <div class="row">
                        <div class="col-md-6">
                            <h3>${patient.last_name} ${patient.first_name}</h3>
                            <p class="text-muted">Mã bệnh nhân: ${patient.patient_id}</p>
                        </div>
                        <div class="col-md-6 text-end">
                            <span class="badge ${patient.status === 'active' ? 'bg-success' : 'bg-secondary'} p-2">
                                ${patient.status === 'active' ? 'Đang hoạt động' : 'Không hoạt động'}
                            </span>
                            <div class="mt-2">
                                <button class="btn btn-outline-primary btn-sm" onclick="editPatient('${patient.patient_id}')">
                                    <i class="bi bi-pencil me-1"></i>Sửa
                                </button>
                                <button class="btn btn-outline-success btn-sm" onclick="createAppointment('${patient.patient_id}')">
                                    <i class="bi bi-calendar-plus me-1"></i>Tạo lịch hẹn
                                </button>
                                <button class="btn btn-outline-info btn-sm" onclick="createPrescription('${patient.patient_id}')">
                                    <i class="bi bi-file-medical me-1"></i>Kê đơn thuốc
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row mt-4">
                        <div class="col-md-12">
                            <ul class="nav nav-tabs" id="patientDetailTabs" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link active" id="info-tab" data-bs-toggle="tab" data-bs-target="#info" type="button" role="tab">
                                        Thông tin cá nhân
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="medical-tab" data-bs-toggle="tab" data-bs-target="#medical" type="button" role="tab">
                                        Thông tin y tế
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="visits-tab" data-bs-toggle="tab" data-bs-target="#visits" type="button" role="tab">
                                        Lịch sử khám bệnh
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="prescriptions-tab" data-bs-toggle="tab" data-bs-target="#prescriptions" type="button" role="tab">
                                        Đơn thuốc
                                    </button>
                                </li>
                            </ul>
                            
                            <div class="tab-content p-3 border border-top-0 rounded-bottom" id="patientDetailTabsContent">
                                <div class="tab-pane fade show active" id="info" role="tabpanel">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="patient-info">
                                                <h5>Thông tin cơ bản</h5>
                                                <table class="table table-borderless">
                                                    <tr>
                                                        <td><strong>Ngày sinh:</strong></td>
                                                        <td>${formatDate(patient.date_of_birth)} (${calculateAge(patient.date_of_birth)} tuổi)</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Giới tính:</strong></td>
                                                        <td>${patient.gender}</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>CMND/CCCD:</strong></td>
                                                        <td>${patient.id_number}</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Nhóm máu:</strong></td>
                                                        <td>${patient.blood_type || 'Chưa có thông tin'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Ngày đăng ký:</strong></td>
                                                        <td>${formatDate(patient.registration_date)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Lần khám gần nhất:</strong></td>
                                                        <td>${formatDate(patient.last_visit_date)}</td>
                                                    </tr>
                                                </table>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="patient-info">
                                                <h5>Thông tin liên hệ</h5>
                                                <table class="table table-borderless">
                                                    <tr>
                                                        <td><strong>Điện thoại:</strong></td>
                                                        <td>${patient.phone}</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Email:</strong></td>
                                                        <td>${patient.email || 'Chưa có thông tin'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Địa chỉ:</strong></td>
                                                        <td>${patient.address || 'Chưa có thông tin'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Người liên hệ khẩn cấp:</strong></td>
                                                        <td>${patient.emergency_contact_name || 'Chưa có thông tin'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>SĐT liên hệ khẩn cấp:</strong></td>
                                                        <td>${patient.emergency_contact_phone || 'Chưa có thông tin'}</td>
                                                    </tr>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="tab-pane fade" id="medical" role="tabpanel">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="patient-info">
                                                <h5>Dị ứng</h5>
                                                ${allergiesList}
                                            </div>
                                            
                                            <div class="patient-info">
                                                <h5>Tiền sử bệnh</h5>
                                                ${historyList}
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="patient-info">
                                                <h5>Thông tin bảo hiểm</h5>
                                                <table class="table table-borderless">
                                                    <tr>
                                                        <td><strong>Nhà cung cấp:</strong></td>
                                                        <td>${patient.insurance_provider || 'Chưa có thông tin'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Mã bảo hiểm:</strong></td>
                                                        <td>${patient.insurance_id || 'Chưa có thông tin'}</td>
                                                    </tr>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="tab-pane fade" id="visits" role="tabpanel">
                                    <div class="alert alert-info">
                                        <i class="bi bi-info-circle me-2"></i>
                                        Chức năng xem lịch sử khám bệnh sẽ được tích hợp với module Hồ sơ Bệnh án Điện tử (EMR).
                                    </div>
                                </div>
                                
                                <div class="tab-pane fade" id="prescriptions" role="tabpanel">
                                    <div class="alert alert-info">
                                        <i class="bi bi-info-circle me-2"></i>
                                        Chức năng xem đơn thuốc sẽ được tích hợp với module Kê toa thuốc.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                document.getElementById('patientDetail').innerHTML = detailHtml;
            } else {
                console.error('Error fetching patient:', result.error);
                alert('Không thể tải thông tin bệnh nhân: ' + result.error);
            }
            hideLoading();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Lỗi kết nối với máy chủ. Vui lòng thử lại sau.');
            hideLoading();
        });
}

// Edit patient
function editPatient(patientId) {
    showLoading();
    
    fetch(`${API_URL}?action=getPatientById&patientId=${encodeURIComponent(patientId)}`)
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                const patient = result.data;
                
                // Switch to add tab (which we'll use for editing)
                document.getElementById('add-tab').click();
                
                // Fill form with patient data
                document.getElementById('firstName').value = patient.first_name;
                document.getElementById('lastName').value = patient.last_name;
                document.getElementById('dateOfBirth').value = patient.date_of_birth;
                document.getElementById('gender').value = patient.gender;
                document.getElementById('idNumber').value = patient.id_number;
                document.getElementById('phone').value = patient.phone;
                document.getElementById('email').value = patient.email || '';
                document.getElementById('address').value = patient.address || '';
                document.getElementById('emergencyContactName').value = patient.emergency_contact_name || '';
                document.getElementById('emergencyContactPhone').value = patient.emergency_contact_phone || '';
                document.getElementById('bloodType').value = patient.blood_type || '';
                
                // Format JSON fields for display
                const allergies = parseJsonField(patient.allergies);
                const medicalHistory = parseJsonField(patient.medical_history);
                
                document.getElementById('allergies').value = Object.entries(allergies)
                    .map(([allergen, severity]) => `${allergen}: ${severity}`)
                    .join(', ');
                
                document.getElementById('medicalHistory').value = Object.entries(medicalHistory)
                    .map(([condition, detail]) => `${condition}: ${detail}`)
                    .join(', ');
                
                document.getElementById('insuranceProvider').value = patient.insurance_provider || '';
                document.getElementById('insuranceId').value = patient.insurance_id || '';
                
                // Change form submission to update instead of add
                const form = document.getElementById('addPatientForm');
                form.removeEventListener('submit', addPatient);
                form.addEventListener('submit', (event) => updatePatient(event, patientId));
                
                // Change button text
                const submitButton = form.querySelector('button[type="submit"]');
                submitButton.textContent = 'Cập nhật bệnh nhân';
            } else {
                console.error('Error fetching patient for editing:', result.error);
                alert('Không thể tải thông tin bệnh nhân: ' + result.error);
            }
            hideLoading();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Lỗi kết nối với máy chủ. Vui lòng thử lại sau.');
            hideLoading();
        });
}

// Update patient
function updatePatient(event, patientId) {
    event.preventDefault();
    showLoading();
    
    // Get updated form data
    const updatedData = {
        first_name: document.getElementById('firstName').value,
        last_name: document.getElementById('lastName').value,
        date_of_birth: document.getElementById('dateOfBirth').value,
        gender: document.getElementById('gender').value,
        id_number: document.getElementById('idNumber').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value || '',
        address: document.getElementById('address').value || '',
        emergency_contact_name: document.getElementById('emergencyContactName').value || '',
        emergency_contact_phone: document.getElementById('emergencyContactPhone').value || '',
        blood_type: document.getElementById('bloodType').value || '',
        allergies: formatJsonField(document.getElementById('allergies').value),
        medical_history: formatJsonField(document.getElementById('medicalHistory').value),
        insurance_provider: document.getElementById('insuranceProvider').value || '',
        insurance_id: document.getElementById('insuranceId').value || ''
    };
    
    // Post to API
    fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'updatePatient',
            patientId: patientId,
            updatedData: updatedData
        })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            // Reset form and listeners
            resetForm();
            const form = document.getElementById('addPatientForm');
            form.removeEventListener('submit', (event) => updatePatient(event, patientId));
            form.addEventListener('submit', addPatient);
            
            // Change button text back
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.textContent = 'Lưu bệnh nhân';
            
            // Switch to list tab and reload data
            document.getElementById('list-tab').click();
            loadPatients();
            
            // Show success message
            alert('Thông tin bệnh nhân đã được cập nhật thành công!');
        } else {
            console.error('Error updating patient:', result.error);
            alert('Lỗi khi cập nhật bệnh nhân: ' + result.error);
        }
        hideLoading();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Lỗi kết nối với máy chủ. Vui lòng thử lại sau.');
        hideLoading();
    });
}

// Confirm delete patient
function confirmDeletePatient(patientId) {
    const patient = allPatients.find(p => p.patient_id === patientId);
    
    if (!patient) {
        alert('Không tìm thấy thông tin bệnh nhân!');
        return;
    }
    
    const fullName = `${patient.last_name} ${patient.first_name}`;
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
    
    document.getElementById('confirmMessage').textContent = `Bạn có chắc chắn muốn xóa bệnh nhân ${fullName} (${patient.patient_id})?`;
    
    const confirmBtn = document.getElementById('confirmAction');
    confirmBtn.onclick = () => {
        deletePatient(patientId);
        confirmModal.hide();
    };
    
    confirmModal.show();
}

// Delete patient
function deletePatient(patientId) {
    showLoading();
    
    fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'deletePatient',
            patientId: patientId
        })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            loadPatients();
            alert('Bệnh nhân đã được xóa thành công!');
        } else {
            console.error('Error deleting patient:', result.error);
            alert('Lỗi khi xóa bệnh nhân: ' + result.error);
        }
        hideLoading();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Lỗi kết nối với máy chủ. Vui lòng thử lại sau.');
        hideLoading();
    });
}

// Reset form fields
function resetForm() {
    document.getElementById('addPatientForm').reset();
    
    // Make sure the form is set up for adding a new patient
    const form = document.getElementById('addPatientForm');
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.textContent = 'Lưu bệnh nhân';
    
    // Make sure we're using the add patient handler
    form.removeEventListener('submit', updatePatient);
    form.addEventListener('submit', addPatient);
}

// Format date from YYYY-MM-DD to DD/MM/YYYY
function formatDate(dateStr) {
    if (!dateStr) return '';
    
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Calculate age from birthdate
function calculateAge(birthdate) {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

// Format text input to JSON for allergies and medical history
function formatJsonField(text) {
    if (!text.trim()) return '{}';
    
    const items = text.split(',').map(item => item.trim());
    const result = {};
    
    items.forEach(item => {
        const parts = item.split(':').map(part => part.trim());
        if (parts.length === 2 && parts[0]) {
            result[parts[0]] = parts[1];
        } else if (parts.length === 1 && parts[0]) {
            result[parts[0]] = 'Yes';
        }
    });
    
    return JSON.stringify(result);
}

// Parse JSON string for display
function parseJsonField(jsonStr) {
    try {
        if (!jsonStr || jsonStr === '') return {};
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('Error parsing JSON:', e, jsonStr);
        return {};
    }
}

// Show loading spinner
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

// Hide loading spinner
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Create appointment (placeholder for integration)
function createAppointment(patientId) {
    alert(`Chức năng đặt lịch hẹn cho bệnh nhân ${patientId} sẽ được tích hợp với module Appointments.`);
}

// Create prescription (placeholder for integration)
function createPrescription(patientId) {
    alert(`Chức năng kê đơn thuốc cho bệnh nhân ${patientId} sẽ được tích hợp với module Prescriptions.`);
}

// Handle CORS error with fallback mechanism
function handleApiResponse(url, options = {}, successCallback, errorCallback) {
    fetch(url, options)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                successCallback(data);
            } else {
                errorCallback(data.error || 'Không xác định được lỗi');
            }
        })
        .catch(error => {
            console.error('API Error:', error);
            errorCallback('Lỗi kết nối với máy chủ. Vui lòng thử lại sau.');
        });
}