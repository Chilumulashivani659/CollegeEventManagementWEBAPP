import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerCoordinator } from '../services/api';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 /_-]{1,59}$/;

const emptyForm = {
  full_name: '',
  email: '',
  designation: 'Faculty',
  department: '',
  employee_id: '',
  student_council_id: '',
  password: '',
  confirm_password: ''
};

const validate = (form) => {
  const errors = {};
  const fullName = form.full_name.trim();
  const email = form.email.trim();
  const department = form.department.trim();
  const isFaculty = form.designation === 'Faculty';

  if (fullName.length < 2) errors.full_name = 'Please enter your full name.';
  else if (fullName.length > 120) errors.full_name = 'Full name must be 120 characters or fewer.';

  if (!email) errors.email = 'College email is required.';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid college email address.';
  else if (email.length > 160) errors.email = 'College email must be 160 characters or fewer.';

  if (isFaculty) {
    const employeeId = form.employee_id.trim();
    if (!employeeId) errors.employee_id = 'Employee ID is required for Faculty members.';
    else if (!ID_PATTERN.test(employeeId)) errors.employee_id = 'Enter a valid Employee ID.';
  } else {
    const councilId = form.student_council_id.trim();
    if (!councilId) {
      errors.student_council_id = 'Student Council ID is required for Student Council Members.';
    } else if (!ID_PATTERN.test(councilId)) {
      errors.student_council_id = 'Enter a valid Student Council ID.';
    }
  }

  if (department.length < 2) errors.department = 'Please enter your department.';
  else if (department.length > 120) errors.department = 'Department must be 120 characters or fewer.';

  if (form.password.length < 8) errors.password = 'Password must be at least 8 characters long.';
  else if (form.password.length > 72) errors.password = 'Password must be 72 characters or fewer.';

  if (form.confirm_password !== form.password) {
    errors.confirm_password = 'Password and Confirm Password do not match.';
  }

  return errors;
};

const CoordinatorRegister = () => {
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  const isFaculty = form.designation === 'Faculty';

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      if (name === 'designation') {
        return {
          ...prev,
          designation: value,
          employee_id: '',
          student_council_id: ''
        };
      }
      return { ...prev, [name]: value };
    });

    setFieldErrors((prev) => {
      const next = { ...prev, [name]: '' };
      if (name === 'designation') {
        delete next.employee_id;
        delete next.student_council_id;
      }
      if (name === 'password') {
        next.confirm_password = '';
      }
      return next;
    });
    if (formError) setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError('Please correct the highlighted fields.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');

      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        designation: form.designation,
        department: form.department.trim(),
        employee_id: isFaculty ? form.employee_id.trim() : undefined,
        student_council_id: isFaculty ? undefined : form.student_council_id.trim(),
        password: form.password,
        confirm_password: form.confirm_password
      };

      const res = await registerCoordinator(payload);
      setSuccess(res.data);
      setForm(emptyForm);
      setFieldErrors({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setFormError(
        err.response?.data?.message || 'Registration failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card shadow-sm" id="registration-success">
              <div className="card-body p-4 p-lg-5 text-center">
                <div className="display-5 mb-2" aria-hidden="true">✅</div>
                <h1 className="h3">Registration submitted</h1>
                <p className="text-muted mb-3">{success.message}</p>
                <p className="mb-4">
                  <span className="badge text-bg-warning">Pending approval</span>
                  <br />
                  <span className="text-muted small">
                    Your college email: <strong>{success.coordinator.email}</strong>
                  </span>
                </p>
                <div className="alert alert-info text-start mb-4">
                  An administrator must approve your account before you can log in and manage
                  events. Please try logging in only after you have been approved.
                </div>
                <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
                  <Link to="/coordinator/login" className="btn btn-primary btn-lg">
                    Go to Coordinator Login
                  </Link>
                  <Link to="/" className="btn btn-outline-secondary btn-lg">
                    Back to Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 py-lg-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="mb-4">
            <Link to="/" className="small text-decoration-none">
              ← Back to Home
            </Link>
            <h1 className="h2 mt-2 mb-1">Coordinator Registration</h1>
            <p className="text-muted mb-0">
              Only Faculty members and authorized Student Council Members may register. New
              accounts stay pending until an administrator approves them.
            </p>
          </div>

          <div className="alert alert-warning" role="note">
            <strong>Approval required:</strong> registering does not log you in. You can manage
            events only after your account is approved.
          </div>

          <div className="card shadow-sm">
            <div className="card-body p-4">
              {formError && (
                <div className="alert alert-danger" role="alert">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="full_name" className="form-label">
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      id="full_name"
                      name="full_name"
                      type="text"
                      className={`form-control ${fieldErrors.full_name ? 'is-invalid' : ''}`}
                      value={form.full_name}
                      onChange={handleChange}
                      autoComplete="name"
                      maxLength={120}
                    />
                    {fieldErrors.full_name && (
                      <div className="invalid-feedback">{fieldErrors.full_name}</div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="email" className="form-label">
                      College Email <span className="text-danger">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`}
                      value={form.email}
                      onChange={handleChange}
                      autoComplete="email"
                      placeholder="name@college.edu"
                      maxLength={160}
                    />
                    {fieldErrors.email && (
                      <div className="invalid-feedback">{fieldErrors.email}</div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="designation" className="form-label">
                      Designation <span className="text-danger">*</span>
                    </label>
                    <select
                      id="designation"
                      name="designation"
                      className="form-select"
                      value={form.designation}
                      onChange={handleChange}
                    >
                      <option value="Faculty">Faculty</option>
                      <option value="Student Council Member">Student Council Member</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="department" className="form-label">
                      Department <span className="text-danger">*</span>
                    </label>
                    <input
                      id="department"
                      name="department"
                      type="text"
                      className={`form-control ${fieldErrors.department ? 'is-invalid' : ''}`}
                      value={form.department}
                      onChange={handleChange}
                      placeholder="e.g., Computer Science"
                      maxLength={120}
                    />
                    {fieldErrors.department && (
                      <div className="invalid-feedback">{fieldErrors.department}</div>
                    )}
                  </div>

                  {isFaculty ? (
                    <div className="col-md-6">
                      <label htmlFor="employee_id" className="form-label">
                        Employee ID <span className="text-danger">*</span>
                      </label>
                      <input
                        id="employee_id"
                        name="employee_id"
                        type="text"
                        className={`form-control ${fieldErrors.employee_id ? 'is-invalid' : ''}`}
                        value={form.employee_id}
                        onChange={handleChange}
                        placeholder="e.g., EMP-CS-101"
                        maxLength={60}
                      />
                      {fieldErrors.employee_id && (
                        <div className="invalid-feedback">{fieldErrors.employee_id}</div>
                      )}
                    </div>
                  ) : (
                    <div className="col-md-6">
                      <label htmlFor="student_council_id" className="form-label">
                        Student Council ID <span className="text-danger">*</span>
                      </label>
                      <input
                        id="student_council_id"
                        name="student_council_id"
                        type="text"
                        className={`form-control ${fieldErrors.student_council_id ? 'is-invalid' : ''}`}
                        value={form.student_council_id}
                        onChange={handleChange}
                        placeholder="e.g., SC-2026-07"
                        maxLength={60}
                      />
                      {fieldErrors.student_council_id && (
                        <div className="invalid-feedback">{fieldErrors.student_council_id}</div>
                      )}
                    </div>
                  )}

                  <div className="col-md-6">
                    <label htmlFor="password" className="form-label">
                      Password <span className="text-danger">*</span>
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      className={`form-control ${fieldErrors.password ? 'is-invalid' : ''}`}
                      value={form.password}
                      onChange={handleChange}
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={72}
                    />
                    {fieldErrors.password ? (
                      <div className="invalid-feedback">{fieldErrors.password}</div>
                    ) : (
                      <div className="form-text">At least 8 characters.</div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="confirm_password" className="form-label">
                      Confirm Password <span className="text-danger">*</span>
                    </label>
                    <input
                      id="confirm_password"
                      name="confirm_password"
                      type="password"
                      className={`form-control ${fieldErrors.confirm_password ? 'is-invalid' : ''}`}
                      value={form.confirm_password}
                      onChange={handleChange}
                      autoComplete="new-password"
                      maxLength={72}
                    />
                    {fieldErrors.confirm_password && (
                      <div className="invalid-feedback">{fieldErrors.confirm_password}</div>
                    )}
                  </div>
                </div>

                <div className="d-flex flex-column flex-sm-row gap-2 mt-4">
                  <button
                    id="register-submit"
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          aria-hidden="true"
                        ></span>
                        Submitting...
                      </>
                    ) : (
                      'Submit Registration'
                    )}
                  </button>
                  <Link to="/coordinator/login" className="btn btn-outline-secondary">
                    Already registered? Log in
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoordinatorRegister;
