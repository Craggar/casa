class CasaCaseDatatable < ApplicationDatatable
  ORDERABLE_FIELDS = %w[
    case_numbers
    status
    has_transition_aged_youth_cases
    assigned_to
    supervisors
    most_recent_attempt_occurred_at
  ]

  private

  def data
    records.map do |casa_case|
      decorated_case = casa_case.decorate
      volunteers = casa_case.assigned_volunteers.map do |volunteer|
        {
          id: volunteer.id,
          display_name: volunteer.display_name
        }
      end
      supervisors = casa_case.assigned_volunteers.map do |volunteer|
        {
          id: volunteer.supervisor&.id,
          display_name: volunteer.supervisor&.display_name
        }
      end
      {
        status: decorated_case.status,
        assigned_to: volunteers,
        viewing_as: params[:current_user_is_volunteer] ? 'volunteer' : 'admin',
        has_transition_aged_youth_cases: casa_case.transition_aged_youth,
        id: casa_case.id,
        case_number: casa_case.case_number,
        most_recent_attempt: {
          case_id: casa_case.id,
          occurred_at: I18n.l(decorated_case.case_contacts_latest&.occurred_at, format: :full, default: nil)
        },
        supervisors: supervisors,
        updated_at: I18n.l(casa_case.updated_at, format: :standard, default: nil)
      }
    end
  end

  def filtered_records
    query = raw_records
      .where(active_filter)
      .where(transition_aged_youth_filter)
      .where(supervisor_filter)
      # .where(search_filter)
    # binding.pry
    query
  end

  def raw_records
    base_relation
      .select(
        <<-SQL
          casa_cases.*
        SQL
      )
      .joins(
        <<-SQL
          LEFT JOIN case_assignments ON case_assignments.casa_case_id = casa_cases.id AND case_assignments.active
        SQL
      )
      .joins(
        <<-SQL
          LEFT JOIN users AS volunteers ON volunteers.id = case_assignments.volunteer_id
        SQL
      )
      .joins(
        <<-SQL
          LEFT JOIN supervisor_volunteers ON supervisor_volunteers.volunteer_id = volunteers.id AND supervisor_volunteers.is_active
        SQL
      )
      .joins(
        <<-SQL
          LEFT JOIN users AS supervisors ON supervisors.id = supervisor_volunteers.supervisor_id
        SQL
      )
      .order(:id)
      .includes(:case_contacts, assigned_volunteers: :supervisor)
  end

  def active_filter
    @active_filter ||=
      lambda {
        filter = additional_filters[:active]

        bool_filter filter do
          ["casa_cases.active = ?", filter[0]]
        end
      }.call
  end

  def transition_aged_youth_filter
    @transition_aged_youth_filter ||=
      lambda {
        filter = additional_filters[:transition_aged_youth]

        bool_filter filter do
          ["casa_cases.transition_aged_youth = ?", filter[0]]
        end
      }.call
  end

  def supervisor_filter
    if (filter = additional_filters[:supervisor]).blank?
      "FALSE"
    elsif filter.all?(&:blank?)
      "supervisor_volunteers.id IS NULL"
    else
      null_filter = "supervisor_volunteers.id IS NULL OR" if filter.any?(&:blank?)
      ["#{null_filter} COALESCE(supervisors.display_name, supervisors.email) IN (?)", filter.select(&:present?)]
    end
  end
end
