/* global $ */
/* global location */
/* global alert */

const defineCaseContactsTable = function () {
  $('table#case_contacts').DataTable(
    {
      scrollX: true,
      searching: false,
      order: [[0, 'desc']]
    }
  )
}

$('document').ready(() => {
  $.fn.dataTable.ext.search.push(
    function (settings, data, dataIndex) {
      if (settings.nTable.id !== 'casa-cases') {
        return true
      }

      const statusArray = []
      const assignedToVolunteerArray = []
      const assignedToMoreThanOneVolunteerArray = []
      const assignedToTransitionYouthArray = []
      const caseNumberPrefixArray = []

      $('.status-options').find('input[type="checkbox"]').each(function () {
        if ($(this).is(':checked')) {
          statusArray.push($(this).data('value'))
        }
      })

      $('.assigned-to-volunteer-options').find('input[type="checkbox"]').each(function () {
        if ($(this).is(':checked')) {
          assignedToVolunteerArray.push($(this).data('value'))
        }
      })

      $('.more-than-one-volunteer-options').find('input[type="checkbox"]').each(function () {
        if ($(this).is(':checked')) {
          assignedToMoreThanOneVolunteerArray.push($(this).data('value'))
        }
      })

      $('.transition-youth-options').find('input[type="checkbox"]').each(function () {
        if ($(this).is(':checked')) {
          assignedToTransitionYouthArray.push($(this).data('value'))
        }
      })

      $('.case-number-prefix-options').find('input[type="checkbox"]').each(function () {
        if ($(this).is(':checked')) {
          caseNumberPrefixArray.push($(this).data('value'))
        }
      })

      const possibleCaseNumberPrefixes = ['CINA', 'TPR']
      const status = data[3]
      const assignedToVolunteer = (data[5] !== '' && data[5].split(',').length >= 1) ? 'Yes' : 'No'
      const assignedToMoreThanOneVolunteer = (data[5] !== '' && data[5].split(',').length > 1) ? 'Yes' : 'No'
      const assignedToTransitionYouth = data[4]
      const caseNumberPrefix = possibleCaseNumberPrefixes.includes(data[0].split('-')[0]) ? data[0].split('-')[0] : 'None'

      return statusArray.includes(status) &&
        assignedToVolunteerArray.includes(assignedToVolunteer) &&
        assignedToMoreThanOneVolunteerArray.includes(assignedToMoreThanOneVolunteer) &&
        assignedToTransitionYouthArray.includes(assignedToTransitionYouth) &&
        caseNumberPrefixArray.includes(caseNumberPrefix)
    }
  )

  const handleAjaxError = e => {
    if (e.status === 401) {
      location.reload()
    } else {
      console.log(e)
      if (e.responseJSON && e.responseJSON.error) {
        alert(e.responseJSON.error)
      } else {
        const responseErrorMessage = e.response.statusText
          ? `\n${e.response.statusText}\n`
          : ''

        alert(`Sorry, try that again?\n${responseErrorMessage}\nIf you're seeing a problem, please fill out the Report A Site Issue
        link to the bottom left near your email address.`)
      }
    }
  }

  // Enable all data tables on dashboard but only filter on volunteers table
  const editSupervisorPath = id => `/supervisors/${id}/edit`
  const editVolunteerPath = id => `/volunteers/${id}/edit`
  const impersonateVolunteerPath = id => `/volunteers/${id}/impersonate`
  const casaCasePath = id => `/casa_cases/${id}`
  const volunteersTable = $('table#volunteers').DataTable({
    autoWidth: false,
    stateSave: false,
    order: [[6, 'desc']],
    columns: [
      {
        name: 'casa_case',
        render: (data, type, row, meta) => {
          return `
            <a href="${casaCasePath(row.id)}">${row.case_number}</a>
            `
        },
        orderable: false
      },
      {
        name: 'active',
        render: (data, type, row, meta) => {
          return `
            <span class="mobile-label">Status</span>
            ${row.status}
          `
        },
        searchable: false
      },
      {
        name: 'has_transition_aged_youth_cases',
        render: (data, type, row, meta) => {
          return `
          <span class="mobile-label">Assigned to Transitioned Aged Youth</span>
          ${row.has_transition_aged_youth_cases === 'true' ? 'Yes 🦋' : 'No 🐛'}`
        },
        searchable: false
      },
      {
        name: 'name',
        render: (data, type, row, meta) => {
          if (row.status === 'Inactive') {
            return `Case was deactivated on: ${row.updated_at}`
          }
          const names = row.assigned_to.map(volunteer => {
            if (row.viewing_as === 'admin') {
              return `
              <a href="${editVolunteerPath(volunteer.id)}">${volunteer.display_name}</a>
              `
            } else {
              return volunteer.display_name
            }
          })
          return `
            <span class="mobile-label">Assigned To</span>
            ${names.join(', ')}
          `
        }
      },
      {
        className: 'supervisor-column',
        name: 'supervisor_name',
        render: (data, type, row, meta) => {
          console.log(row)
          if (row.status === 'Inactive') {
            return `Case was deactivated on: ${row.updated_at}`
          }
          const supervisors = row.supervisors.map(supervisor => {
            if (row.viewing_as === 'admin') {
              return `
              <a href="${editSupervisorPath(supervisor.id)}">${supervisor.display_name}</a>
              `
            } else {
              return supervisor.display_name
            }
          })
          return `
            <span class="mobile-label">Supervisor</span>
            ${supervisors.join(', ')}
          `
        },
        visible: false
      },
      {
        name: 'most_recent_attempt_occurred_at',
        render: (data, type, row, meta) => {
          return row.most_recent_attempt.case_id
            ? `
              <span class="mobile-label">Last Attempted Contact</span>
              <a href="${casaCasePath(row.most_recent_attempt.case_id)}">
                ${row.most_recent_attempt.occurred_at}
              </a>
            `
            : 'None ❌'
        },
        searchable: false,
        visible: true
      },
      {
        name: 'contacts_made_in_past_days',
        render: (data, type, row, meta) => {
          return `
          <span class="mobile-label">Contacts</span>
          ${row.contacts_made_in_past_days}
          `
        },
        searchable: false,
        visible: false
      }
    ],
    processing: true,
    serverSide: true,
    ajax: {
      url: $('table#volunteers').data('source'),
      type: 'POST',
      data: function (d) {
        const supervisorOptions = $('.supervisor-options input:checked')
        const supervisorFilter = Array.from(supervisorOptions).map(option => option.dataset.value)

        const statusOptions = $('.status-options input:checked')
        const statusFilter = Array.from(statusOptions).map(option => JSON.parse(option.dataset.value))

        const transitionYouthOptions = $('.transition-youth-options input:checked')
        const transitionYouthFilter = Array.from(transitionYouthOptions).map(option => JSON.parse(option.dataset.value))

        const assignedToVolunteerOptions = $('.assigned-to-volunteer-options input:checked')
        const assignedToVolunteerFilter = Array.from(assignedToVolunteerOptions).map(option => JSON.parse(option.dataset.value))

        const assignedToManyVolunteersOptions = $('.more-than-one-volunteer-options input:checked')
        const assignedToManyVolunteersFilter = Array.from(assignedToManyVolunteersOptions).map(option => option.dataset.value)

        const caseNumberPrefixOptions = $('.case-number-prefix-options input:checked')
        const caseNumberPrefixFilter = Array.from(caseNumberPrefixOptions).map(option => option.dataset.value)

        return $.extend({}, d, {
          additional_filters: {
            supervisor: supervisorFilter,
            active: statusFilter,
            transition_aged_youth: transitionYouthFilter,
            assigned_to_volunteer: assignedToVolunteerFilter,
            assigned_to_many_volunteers: assignedToManyVolunteersFilter,
            case_number_prefix: caseNumberPrefixFilter
          }
        })
      },
      error: handleAjaxError,
      dataType: 'json'
    },
    drawCallback: function (settings) {
      $('[data-toggle=tooltip]').tooltip()
    }
  })

  // Because the table saves state, we have to check/uncheck modal inputs based on what
  // columns are visible
  volunteersTable.columns().every(function (index) {
    const columnVisible = this.visible()

    if (columnVisible) {
      $('#visibleColumns input[data-column="' + index + '"]').prop('checked', true)
    } else {
      $('#visibleColumns input[data-column="' + index + '"]').prop('checked', false)
    }

    return true
  })

  const casaCasesTable = $('table#casa-cases').DataTable({
    autoWidth: false,
    stateSave: false,
    columnDefs: [],
    language: {
      emptyTable: 'No active cases'
    }
  })

  casaCasesTable.columns().every(function (index) {
    const columnVisible = this.visible()

    if (columnVisible) {
      $('#visibleColumns input[data-column="' + index + '"]').prop('checked', true)
    } else {
      $('#visibleColumns input[data-column="' + index + '"]').prop('checked', false)
    }

    return true
  })

  defineCaseContactsTable()

  function filterOutUnassignedVolunteers (checked) {
    $('.supervisor-options').find('input[type="checkbox"]').not('#unassigned-vol-filter').each(function () {
      this.checked = checked
    })
  }

  $('#unassigned-vol-filter').on('click', function () {
    if ($('#unassigned-vol-filter').is(':checked')) {
      filterOutUnassignedVolunteers(false)
    } else {
      filterOutUnassignedVolunteers(true)
    }
    volunteersTable.draw()
  })

  $('.volunteer-filters input[type="checkbox"]').not('#unassigned-vol-filter').on('click', function () {
    volunteersTable.draw()
  })

  $('.casa-case-filters input[type="checkbox"]').on('click', function () {
    casaCasesTable.draw()
  })

  $('input.toggle-visibility').on('click', function (e) {
    // Get the column API object and toggle the visibility
    const column = volunteersTable.column($(this).attr('data-column'))
    column.visible(!column.visible())
    volunteersTable.columns.adjust().draw()

    const caseColumn = casaCasesTable.column($(this).attr('data-column'))
    caseColumn.visible(!caseColumn.visible())
    casaCasesTable.columns.adjust().draw()
  })
})

export { defineCaseContactsTable }
