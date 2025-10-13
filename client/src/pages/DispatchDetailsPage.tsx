import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";

type DispatchTab = "summary" | "create";

function DispatchDetailsPage() {
  const [activeTab, setActiveTab] = useState<DispatchTab>("summary");

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          Dispatch Details
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track dispatch requests, confirm logistics, and capture shipment references. Expand this space as the workflow evolves.
        </Typography>
      </Box>

      <Card>
        <CardHeader title="Dispatch Workspace" />
        <Divider />
        <CardContent>
          <Tabs
            value={activeTab}
            onChange={(_event, value) => setActiveTab(value)}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{ mb: 3 }}
          >
            <Tab label="Recent Overview" value="summary" />
            <Tab label="Create Dispatch" value="create" />
          </Tabs>

          {activeTab === "summary" && (
            <Alert severity="info">
              No dispatch data yet. Populate this section with summaries or link it to backend data when ready.
            </Alert>
          )}

          {activeTab === "create" && (
            <Stack spacing={3}>
              <Typography variant="subtitle1">New Dispatch</Typography>
              <TextField label="Dispatch ID" placeholder="Enter unique dispatch reference" fullWidth />
              <TextField label="Destination" placeholder="Enter destination location" fullWidth />
              <TextField label="Courier Partner" placeholder="Enter courier/logistics partner" fullWidth />
              <TextField label="Remarks" placeholder="Add any additional notes" multiline rows={3} fullWidth />
              <Box>
                <Button variant="contained" disabled>
                  Save Dispatch (Coming Soon)
                </Button>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

export default DispatchDetailsPage;
