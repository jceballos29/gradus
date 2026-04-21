using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gradus.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "homologation_requests",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    student_identity = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    student_azure_oid = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    student_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    student_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    source_program_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    source_program_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    target_program_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    target_program_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    total_subjects_evaluated = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    total_subjects_approved = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    total_credits_homologated = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    student_notes = table.Column<string>(type: "text", nullable: true),
                    coordinator_notes = table.Column<string>(type: "text", nullable: true),
                    reviewed_by_azure_oid = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    reviewed_at = table.Column<DateTime>(type: "timestamptz", nullable: true),
                    document_url = table.Column<string>(type: "text", nullable: true),
                    document_generated_at = table.Column<DateTime>(type: "timestamptz", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamptz", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamptz", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_homologation_requests", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "homologation_rules",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_program_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    target_program_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    min_grade = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: false),
                    max_credits_percentage = table.Column<int>(type: "integer", nullable: false),
                    requires_same_area = table.Column<bool>(type: "boolean", nullable: false),
                    active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_by_azure_oid = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    updated_by_azure_oid = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamptz", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamptz", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_homologation_rules", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "notifications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    recipient_azure_oid = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    message = table.Column<string>(type: "text", nullable: false),
                    type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    reference_id = table.Column<Guid>(type: "uuid", nullable: true),
                    read_at = table.Column<DateTime>(type: "timestamptz", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamptz", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notifications", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "homologation_subjects",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    homologation_request_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_subject_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    source_subject_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    source_grade = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: false),
                    source_credits = table.Column<int>(type: "integer", nullable: false),
                    source_area = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    target_subject_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    target_subject_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    target_credits = table.Column<int>(type: "integer", nullable: false),
                    is_homologable = table.Column<bool>(type: "boolean", nullable: false),
                    rejection_reason = table.Column<int>(type: "integer", maxLength: 50, nullable: true),
                    coordinator_override = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    auto_approved = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    coordinator_notes = table.Column<string>(type: "text", nullable: true),
                    overridden_by_azure_oid = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamptz", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_homologation_subjects", x => x.id);
                    table.ForeignKey(
                        name: "FK_homologation_subjects_homologation_requests_homologation_re~",
                        column: x => x.homologation_request_id,
                        principalTable: "homologation_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "subject_equivalences",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_program_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    target_program_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    source_subject_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    source_subject_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    source_credits = table.Column<int>(type: "integer", nullable: false),
                    target_subject_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    target_subject_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    target_credits = table.Column<int>(type: "integer", nullable: false),
                    min_grade_override = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: true),
                    active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_by_azure_oid = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    updated_by_azure_oid = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamptz", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamptz", nullable: false),
                    homologation_rule_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_subject_equivalences", x => x.id);
                    table.ForeignKey(
                        name: "FK_subject_equivalences_homologation_rules_homologation_rule_id",
                        column: x => x.homologation_rule_id,
                        principalTable: "homologation_rules",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_homologation_requests_active_check",
                table: "homologation_requests",
                columns: new[] { "student_identity", "source_program_code", "target_program_code", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_homologation_requests_status",
                table: "homologation_requests",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_homologation_requests_student_identity",
                table: "homologation_requests",
                column: "student_identity");

            migrationBuilder.CreateIndex(
                name: "ix_homologation_rules_active",
                table: "homologation_rules",
                column: "active");

            migrationBuilder.CreateIndex(
                name: "ix_homologation_rules_program_pair",
                table: "homologation_rules",
                columns: new[] { "source_program_code", "target_program_code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_homologation_subjects_is_homologable",
                table: "homologation_subjects",
                column: "is_homologable");

            migrationBuilder.CreateIndex(
                name: "ix_homologation_subjects_request_id",
                table: "homologation_subjects",
                column: "homologation_request_id");

            migrationBuilder.CreateIndex(
                name: "ix_notifications_created_at",
                table: "notifications",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "ix_notifications_recipient_unread",
                table: "notifications",
                columns: new[] { "recipient_azure_oid", "read_at" });

            migrationBuilder.CreateIndex(
                name: "IX_subject_equivalences_homologation_rule_id",
                table: "subject_equivalences",
                column: "homologation_rule_id");

            migrationBuilder.CreateIndex(
                name: "ix_subject_equivalences_program_pair",
                table: "subject_equivalences",
                columns: new[] { "source_program_code", "target_program_code" });

            migrationBuilder.CreateIndex(
                name: "ix_subject_equivalences_source_subject",
                table: "subject_equivalences",
                column: "source_subject_code");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "homologation_subjects");

            migrationBuilder.DropTable(
                name: "notifications");

            migrationBuilder.DropTable(
                name: "subject_equivalences");

            migrationBuilder.DropTable(
                name: "homologation_requests");

            migrationBuilder.DropTable(
                name: "homologation_rules");
        }
    }
}
